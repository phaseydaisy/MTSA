const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');
const { aiConfig } = require('./src/ai/aiConfig');
const { chatWithOpenRouter } = require('./src/ai/openrouterClient');
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

function sanitizeAiReply(reply) {
    if (!reply || typeof reply !== 'string') return '';

    let cleaned = reply;

    cleaned = cleaned.replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/gi, '$1');
    cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');
    cleaned = cleaned.replace(/\b(?:www\.)?[a-z0-9-]+\.(?:com|net|org|gg|io|ai|dev|co|app|xyz|edu|gov)\b/gi, '');
    cleaned = cleaned.replace(/\b(?:according to|as\s+[a-z0-9.-]+\s+(?:says|suggests|states))\b[^.?!]*[.?!]?/gi, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    return cleaned;
}

function buildSystemPromptWithTime(basePrompt) {
    const now = new Date();
    const utcNow = now.toISOString();
    const localNow = now.toLocaleString();
    const timeContext = `Current time (UTC): ${utcNow}. Current local server time: ${localNow}.`;
    return `${basePrompt}\n\n${timeContext}`;
}

async function getAiReply(content, historyKey) {
    const maxMessages = memoryOptions.maxMessages ? memoryOptions.maxMessages : 0;
    const history = memoryEnabled ? aiHistory.get(historyKey) || [] : [];

    const reply = await chatWithOpenRouter(content, {
        model: aiConfig.model,
        modelFallbacks: aiConfig.modelFallbacks,
        maxTokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        systemPrompt: buildSystemPromptWithTime(aiConfig.systemPrompt),
        messages: history
    });

    if (!reply) return '';

    const sanitizedReply = sanitizeAiReply(reply);
    if (!sanitizedReply) return '';

    const trimmedReply = sanitizedReply.length > aiConfig.maxReplyLength
        ? sanitizedReply.slice(0, aiConfig.maxReplyLength - 3) + '...'
        : sanitizedReply;

    if (memoryEnabled && maxMessages > 0) {
        const nowIso = new Date().toISOString();
        history.push({ role: 'user', content, timestamp: nowIso });
        history.push({ role: 'assistant', content: trimmedReply, timestamp: nowIso });
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

    if (normalized.length < minChars || wordCount < minWords) return false;
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

client.once('clientReady', async () => {
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
            const targetChannelId = textChannelId || voiceChannelId;
            logger.debug(`Voice handler target channel: ${targetChannelId || 'none'} (text=${textChannelId || 'none'}, voice=${voiceChannelId || 'none'})`);
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
                    } else {
                        logger.warn(`Voice verify channel is not text-capable: ${targetChannelId}`);
                    }
                } catch (error) {
                    logger.error('Voice verify prompt failed:', error.message || error);
                }

                return '';
            }

            const reply = await getAiReply(text, historyKey);
            if (!reply) {
                logger.warn(`Voice AI produced empty reply for user ${userId}`);
                return '';
            }

            if (targetChannelId) {
                try {
                    const channel = await client.channels.fetch(targetChannelId);
                    if (channel && typeof channel.send === 'function') {
                        await channel.send(`**<@${userId}> said:** ${text}\n${reply}`);
                        logger.info(`Voice text reply sent to channel ${targetChannelId} for user ${userId}`);
                    } else {
                        logger.warn(`Voice response channel is not text-capable: ${targetChannelId}`);
                    }
                } catch (error) {
                    logger.error('Voice text reply failed:', error.message || error);
                }
            } else {
                logger.warn(`No target channel available for voice reply (guild ${guildId}, user ${userId})`);
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
        if (error && (error.code === 10062 || error.code === 40060)) {
            logger.warn(`Interaction expired for command ${interaction.commandName} (${interaction.id})`);
            return;
        }

        logger.error(error);
        const errorMessage = 'An error occurred while executing this command.';
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
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
