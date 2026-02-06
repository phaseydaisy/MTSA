const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { aiConfig } = require('./src/ai/aiConfig');
const { startPuterBridge } = require('./src/ai/bridgeServer');
const { startHeadlessBridge } = require('./src/ai/headlessBridge');
const { chatWithPuter } = require('./src/ai/puterClient');
require('dotenv').config();

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
            const command = require(filePath);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load command ${file}:`, error);
        }
    }
}

async function registerCommands() {
    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`✅ Synced ${commands.length} command(s)`);
    } catch (error) {
        if (error.status === 400) {
            console.warn(`⚠️ Command sync warning (400):`, error.message);
        } else {
            console.error('❌ Failed to sync commands:', error);
        }
    }
}

client.once('ready', async () => {
    console.log(`Bot logged in as ${client.user.tag}`);
    console.log('Bot is ready to use!');
    await registerCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMessage = 'An error occurred while executing this command.';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

const lastAiReplyAt = new Map();

client.on('messageCreate', async message => {
    if (!aiConfig.enabled) return;
    if (message.author.bot) return;
    if (!aiConfig.channelIds.includes(message.channelId)) return;

    const content = (message.content || '').trim();
    if (!content) return;

    const now = Date.now();
    const last = lastAiReplyAt.get(message.channelId) || 0;
    if (aiConfig.cooldownMs > 0 && now - last < aiConfig.cooldownMs) return;

    try {
        await message.channel.sendTyping();
        const reply = await chatWithPuter(content, {
            model: aiConfig.model,
            systemPrompt: aiConfig.systemPrompt,
            bridgeUrl: `http://localhost:${aiConfig.bridgePort}`,
            timeoutMs: aiConfig.bridgeTimeoutMs
        });

        if (!reply) return;

        const trimmedReply = reply.length > aiConfig.maxReplyLength
            ? reply.slice(0, aiConfig.maxReplyLength - 3) + '...'
            : reply;

        await message.reply(trimmedReply);
        lastAiReplyAt.set(message.channelId, now);
    } catch (error) {
        console.error('AI reply failed:', error.message || error);
    }
});

loadCommands();

if (aiConfig.enabled) {
    startPuterBridge({
        port: aiConfig.bridgePort,
        timeoutMs: aiConfig.bridgeTimeoutMs
    });

    if (aiConfig.headlessBridge && aiConfig.headlessBridge.enabled) {
        const bridgeUrl = `http://localhost:${aiConfig.bridgePort}/`;
        startHeadlessBridge({
            url: bridgeUrl,
            headless: aiConfig.headlessBridge.headless,
            slowMoMs: aiConfig.headlessBridge.slowMoMs,
            userDataDir: aiConfig.headlessBridge.userDataDir,
            executablePath: aiConfig.headlessBridge.executablePath
        }).catch(error => {
            console.error('Headless Puter bridge failed:', error.message || error);
        });
    }
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Error: DISCORD_TOKEN not found in .env file');
    console.error('Please create a .env file with your Discord bot token:');
    console.error('DISCORD_TOKEN=your_token_here');
    process.exit(1);
}

client.login(token);
