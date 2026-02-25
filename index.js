const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');
const { aiConfig } = require('./src/ai/aiConfig');
const { chatWithGroq } = require('./src/ai/groqClient');
const { loadMemoryMap, createMemorySaver } = require('./src/ai/memoryStore');
const { setResponseHandler, setVoiceConfig } = require('./src/ai/voiceState');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
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
                logger.log(`✅ Loaded command: ${command.data.name}`);
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

const lastAiReplyAt = new Map();
const memoryOptions = aiConfig.memory || {};
const memoryEnabled = Boolean(memoryOptions.enabled);
const memoryPersistent = Boolean(memoryOptions.persist);
const aiHistory = memoryPersistent ? loadMemoryMap(memoryOptions) : new Map();
const memorySaver = memoryPersistent ? createMemorySaver(aiHistory, memoryOptions) : null;
const pendingVoiceVerifications = new Map();

function getHistoryKey(message) {
    if (aiConfig.memory && aiConfig.memory.scope === 'user') {
        return `${message.channelId}:${message.author.id}`;
    }
    return message.channelId;
}

function trimHistory(history, maxMessages) {
    if (!Array.isArray(history)) return [];
    if (history.length <= maxMessages) return history;
    return history.slice(history.length - maxMessages);
}

async function getAiReply(content, historyKey) {
    const maxMessages = memoryOptions.maxMessages ? memoryOptions.maxMessages : 0;
    const history = memoryEnabled ? aiHistory.get(historyKey) || [] : [];

    const reply = await chatWithGroq(content, {
        model: aiConfig.model,
        systemPrompt: aiConfig.systemPrompt,
        messages: history
    });

    if (!reply) return '';

    const trimmedReply = reply.length > aiConfig.maxReplyLength
        ? reply.slice(0, aiConfig.maxReplyLength - 3) + '...'
        : reply;

    if (memoryEnabled && maxMessages > 0) {
        history.push({ role: 'user', content });
        history.push({ role: 'assistant', content: trimmedReply });
        aiHistory.set(historyKey, trimHistory(history, maxMessages));
        if (memorySaver) {
            memorySaver.scheduleSave();
        }
    }

    return trimmedReply;
}

function getVoiceVerifyKey(guildId, userId) {
    return `${guildId}:${userId}`;
}

function normalizeText(value) {
    return (value || '').trim();
}

function shouldVerifyTranscript(transcript) {
    const verifyConfig = aiConfig.voice && aiConfig.voice.verify ? aiConfig.voice.verify : null;
    if (!verifyConfig || !verifyConfig.enabled) return false;

    const normalized = normalizeText(transcript);
    const lower = normalized.toLowerCase();
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    const minChars = verifyConfig.minTranscriptChars || 0;
    const minWords = verifyConfig.minTranscriptWords || 0;
    const triggerPhrases = Array.isArray(verifyConfig.triggerPhrases)
        ? verifyConfig.triggerPhrases
        : [];

    if (normalized.length < minChars || wordCount < minWords) return true;
    return triggerPhrases.some(phrase => lower.includes(phrase));
}

async function handleVoiceVerification(message) {
    if (!message.guildId || message.author.bot) return false;

    const key = getVoiceVerifyKey(message.guildId, message.author.id);
    const pending = pendingVoiceVerifications.get(key);
    if (!pending) return false;
    if (message.channelId !== pending.channelId) return false;

    if (Date.now() > pending.expiresAt) {
        pendingVoiceVerifications.delete(key);
        return false;
    }

    const response = normalizeText(message.content).toLowerCase();
    const confirmSet = new Set(['yes', 'y', 'yeah', 'yep', 'confirm']);
    const rejectSet = new Set(['no', 'n', 'nah', 'nope', 'cancel']);

    if (confirmSet.has(response)) {
        pendingVoiceVerifications.delete(key);
        const historyKey = `voice:${pending.guildId}:${pending.userId}`;
        const reply = await getAiReply(pending.transcript, historyKey);
        if (reply) {
            await message.channel.send(`**<@${pending.userId}> said:** ${pending.transcript}\n${reply}`);
        }
        return true;
    }

    if (rejectSet.has(response)) {
        pendingVoiceVerifications.delete(key);
        await message.reply('Okay, ignoring that.');
        return true;
    }

    return false;
}

client.once('ready', async () => {
    logger.log(`Bot logged in as ${client.user.tag}`);
    logger.log('Bot is ready to use!');
    await registerCommands();

    if (aiConfig.voice && aiConfig.voice.enabled) {
        setVoiceConfig({
            sttModel: aiConfig.voice.sttModel,
            ttsModel: aiConfig.voice.ttsModel,
            ttsVoice: aiConfig.voice.ttsVoice,
            textOnly: aiConfig.voice.textOnly,
            minSpeechMs: aiConfig.voice.minSpeechMs,
            maxSpeechMs: aiConfig.voice.maxSpeechMs,
            botUserId: client.user.id
        });

        setResponseHandler(async ({ guildId, userId, text, textChannelId, voiceChannelId }) => {
            const historyKey = `voice:${guildId}:${userId}`;
            const targetChannelId = voiceChannelId || textChannelId;
            if (targetChannelId && shouldVerifyTranscript(text)) {
                const verifyConfig = aiConfig.voice.verify;
                const key = getVoiceVerifyKey(guildId, userId);
                pendingVoiceVerifications.set(key, {
                    guildId,
                    userId,
                    transcript: normalizeText(text),
                    channelId: targetChannelId,
                    expiresAt: Date.now() + (verifyConfig.timeoutMs || 15000)
                });

                try {
                    const channel = await client.channels.fetch(targetChannelId);
                    if (channel && typeof channel.send === 'function') {
                        await channel.send(`**<@${userId}> did you say:** ${normalizeText(text)}\nReply "yes" or "no" within 15s.`);
                    }
                } catch (error) {
                    logger.error('Voice verify prompt failed:', error.message || error);
                }

                return '';
            }

            const reply = await getAiReply(text, historyKey);
            if (!reply) return '';

            if (targetChannelId) {
                try {
                    const channel = await client.channels.fetch(targetChannelId);
                    if (channel && typeof channel.send === 'function') {
                        await channel.send(`**<@${userId}> said:** ${text}\n${reply}`);
                    }
                } catch (error) {
                    logger.error('Voice text reply failed:', error.message || error);
                }
            }

            return reply;
        });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        logger.command(interaction.commandName, interaction.user, interaction.guild);
        await command.execute(interaction);
    } catch (error) {
        logger.error(error);
        const errorMessage = 'An error occurred while executing this command.';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (await handleVoiceVerification(message)) return;
    if (!aiConfig.enabled) return;
    if (message.author.bot) return;
    if (!aiConfig.channelIds.includes(message.channelId)) return;

    const content = (message.content || '').trim();
    if (!content) return;

    const now = Date.now();
    const last = lastAiReplyAt.get(message.channelId) || 0;
    if (aiConfig.cooldownMs > 0 && now - last < aiConfig.cooldownMs) return;

    const historyKey = getHistoryKey(message);

    try {
        await message.channel.sendTyping();
        const reply = await getAiReply(content, historyKey);

        if (!reply) return;
        logger.ai(message.author, content, reply);
        await message.reply(`> ${content}\n${reply}`);
        lastAiReplyAt.set(message.channelId, now);
    } catch (error) {
        logger.error('AI reply failed:', error.message || error);
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
    if (memorySaver) {
        try {
            memorySaver.flush();
        } catch (error) {
            logger.error('Failed to flush AI memory:', error.message || error);
        }
    }
    logger.log('Bot shutting down...');
    process.exit(code);
}

process.on('SIGINT', () => flushMemoryAndExit(0));
process.on('SIGTERM', () => flushMemoryAndExit(0));
