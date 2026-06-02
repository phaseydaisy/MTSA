const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');
const { handlePrefixCommands } = require('./src/commands/extra');
const aiCommand = require('./src/commands/ai');
require('dotenv').config();

const TS_CHANNEL_ID = '1414368687237894204';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const loaded = require(filePath);
            const commands = Array.isArray(loaded) ? loaded : [loaded];

            for (const command of commands) {
                if (command && command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    logger.log(`✅ Loaded command: ${command.data.name}`);
                }
            }
        } catch (error) {
            logger.error(`❌ Failed to load command ${file}:`, error);
        }
    }
}

async function registerCommands() {
    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        logger.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        logger.log(`✅ Synced ${commands.length} command(s)`);
    } catch (error) {
        if (error.status === 400) {
            logger.warn('⚠️ Command sync warning (400):', error.message);
        } else {
            logger.error('❌ Failed to sync commands:', error);
        }
    }
}



function getFullCommand(interaction) {
    let fullCommand = `/${interaction.commandName}`;

    try {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand(false);

        if (group) {
            fullCommand += ` ${group}`;
        }
        if (subcommand) {
            fullCommand += ` ${subcommand}`;
        }
    } catch (error) {
        // If no subcommand/group exists, just log the base command.
    }

    return fullCommand;
}

client.once('ready', async () => {
    logger.log(`Bot logged in as ${client.user.tag}`);
    logger.log('Bot is ready to use!');
    logger.log(`Guilds: ${client.guilds.cache.size}`);
    const totalMembers = client.guilds.cache.reduce((sum, guild) => sum + (guild.memberCount || 0), 0);
    logger.log(`Approx total members across guilds: ${totalMembers}`);
    await registerCommands();

});

client.on('interactionCreate', async interaction => {
    const startTime = Date.now();

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Defer immediately to prevent expiration
    try {
        await interaction.deferReply();
    } catch (deferError) {
        // Only log if it's not an "Unknown interaction" error (which is expected due to network latency)
        if (!deferError.message?.includes('Unknown interaction')) {
            logger.warn(`Failed to defer interaction for ${interaction.commandName}: ${deferError.message}`);
        } else {
            logger.debug(`Interaction expired before processing: ${interaction.commandName} (${interaction.id})`);
        }
        return;
    }

    try {
        logger.command(getFullCommand(interaction), interaction.user, interaction.guild);
        await command.execute(interaction);

        const processingTime = Date.now() - startTime;
        if (processingTime > 2000) { // Log slow commands (>2 seconds)
            logger.warn(`Slow command execution: ${interaction.commandName} took ${processingTime}ms`);
        }
    } catch (error) {
        if (error && (error.code === 10062 || error.code === 40060)) {
            logger.warn(`Interaction expired for command ${interaction.commandName} (${interaction.id})`);
            return;
        }

        logger.error(error);
        const errorMessage = 'An error occurred while executing this command.';
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMessage, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
            }
        } catch (replyError) {
            if (replyError && (replyError.code === 10062 || replyError.code === 40060)) {
                logger.warn(`Unable to send command error response due to interaction state (${replyError.code}) for ${interaction.commandName} (${interaction.id})`);
                return;
            }
            logger.error('Failed to send interaction error response:', replyError.message || replyError);
        }
    }
});

client.on('error', error => {
    logger.error('Discord client error:', error.message || error);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (await handlePrefixCommands(message)) return;

    if (message.channel?.id === TS_CHANNEL_ID) {
        const text = String(message.content || '').trim();
        if (!text) return;

        try {
            const reply = await aiCommand.generateAiResponse(text, message.channel.id, message.author.id);
            if (reply) {
                await message.channel.send(reply);
            }
        } catch (error) {
            logger.error('TS channel AI reply failed:', error.message || error);
        }
    }
});

loadCommands();

const token = process.env.DISCORD_TOKEN;
if (!token) {
    logger.error('❌ Error: DISCORD_TOKEN not found in .env file');
    logger.error('Please create a .env file with your Discord bot token:');
    logger.error('DISCORD_TOKEN=your_token_here');
    process.exit(1);
}

client.login(token);

function flushMemoryAndExit(code = 0) {
    logger.log('Bot shutting down...');
    process.exit(code);
}

process.on('SIGINT', () => flushMemoryAndExit(0));
process.on('SIGTERM', () => flushMemoryAndExit(0));
