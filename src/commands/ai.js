const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const MEMORY_FILE = path.join(__dirname, '..', 'jsons', 'ai_memory.json');
const AI_SERVICE_URL = process.env.LOCAL_AI_URL || process.env.AI_URL || 'http://127.0.0.1:8000/v1/chat/completions';
const DEFAULT_MODEL = process.env.AI_MODEL || 'llama2:7b';
const VALIDATION_MODEL = process.env.AI_VALIDATION_MODEL || 'mistral:latest';
const MEMORY_ENABLED = true;
const MEMORY_SCOPE = 'channel';
const MAX_MEMORY_MESSAGES = 20;

let aiMemory = loadMemory();

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_FILE)) {
            return {};
        }
        const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        logger.error('Failed to load AI memory file:', error.message || error);
        return {};
    }
}

function saveMemory() {
    try {
        fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(aiMemory, null, 2), 'utf8');
    } catch (error) {
        logger.error('Failed to save AI memory file:', error.message || error);
    }
}

function getMemoryKey(channelId, userId) {
    if (MEMORY_SCOPE === 'user' && userId) {
        return `${channelId}:${userId}`;
    }
    return channelId;
}

function loadHistory(channelId, userId) {
    const key = getMemoryKey(channelId, userId);
    return Array.isArray(aiMemory[key]) ? aiMemory[key] : [];
}

function saveHistory(channelId, userId, history) {
    const key = getMemoryKey(channelId, userId);
    aiMemory[key] = history.slice(-MAX_MEMORY_MESSAGES * 2);
    saveMemory();
}

function appendHistory(channelId, userId, role, content) {
    const history = loadHistory(channelId, userId);
    history.push({ role, content });
    saveHistory(channelId, userId, history);
}

function buildSystemPrompt() {
    return `You are Nekotina, a chaotic, sarcastic chat bot who acts like they are always mildly annoyed.
Don't ever sound like a corporate bot. Keep it messy, goofy, and a little extra.
Use slang, call out dumb assumptions, and if you do not know the answer, say something like "idk, bruh" instead of pretending.
Explain your thinking with a bit of attitude, then give the answer without trying to be fancy.`;
}

function buildReasoningInstruction() {
    return `Reasoning instructions:
1. Figure out what the user is actually asking, even if they are being weird.
2. Pull the real facts from the question.
3. Think it through in your head step-by-step like you're ranting to a friend.
4. Give a short final answer that is useful, not just flexy.
If you're shaky on the answer, be honest and say so.`;
}

function buildValidationInstruction() {
    return `You are a rude editor bot. Check the first answer for dumb mistakes and rewrite it so it sounds sharper.
Keep the vibe loose and not corporate. If the answer is already okay, make it slightly sassier and clearer.
Output only the final revised answer.`;
}

function buildMessageBatch(query, history) {
    const recentHistory = history.slice(-MAX_MEMORY_MESSAGES);
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'system', content: buildReasoningInstruction() }
    ];

    for (const entry of recentHistory) {
        if (entry.role === 'user' || entry.role === 'assistant') {
            messages.push(entry);
        }
    }

    messages.push({ role: 'user', content: query });
    return messages;
}

function buildValidationBatch(query, assistantReply) {
    return [
        { role: 'system', content: buildValidationInstruction() },
        {
            role: 'user',
            content: `Original question:\n${query}\n\nAssistant reply:\n${assistantReply}`
        }
    ];
}

async function callAiService(messages, model) {
    // Convert OpenAI format to Ollama format
    const prompt = messages.map(msg => {
        if (msg.role === 'system') {
            return `System: ${msg.content}`;
        } else if (msg.role === 'user') {
            return `User: ${msg.content}`;
        } else if (msg.role === 'assistant') {
            return `Assistant: ${msg.content}`;
        }
        return msg.content;
    }).join('\n\n');

    const payload = {
        model,
        prompt,
        stream: false,
        options: {
            temperature: 0.2,
            top_p: 0.95,
            num_predict: 700
        }
    };

    try {
        const response = await axios.post(`${AI_SERVICE_URL.replace('/v1/chat/completions', '/api/generate')}`, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        const content = response?.data?.response;
        if (typeof content === 'string') {
            return content.trim();
        }

        throw new Error('Unexpected AI response format');
    } catch (error) {
        logger.error('AI service call failed:', error.message || error);
        throw error;
    }
}

async function generateAiReply(query, history) {
    const messages = buildMessageBatch(query, history);
    const assistantReply = await callAiService(messages, DEFAULT_MODEL);

    if (!assistantReply) {
        return assistantReply;
    }

    const validationMessages = buildValidationBatch(query, assistantReply);
    const validatedReply = await callAiService(validationMessages, VALIDATION_MODEL || DEFAULT_MODEL);

    return validatedReply || assistantReply;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Ask the local AI chatbot a reasoning-focused question')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('What do you want the AI to answer?')
                .setRequired(true))
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const query = interaction.options.getString('query', true).trim();
        if (!query) {
            return interaction.editReply({ content: 'Please provide a question or prompt.', flags: MessageFlags.Ephemeral });
        }

        if (!AI_SERVICE_URL) {
            return interaction.editReply({
                content: 'AI service is not configured. Set LOCAL_AI_URL or AI_URL in your environment to a local model endpoint.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const channelId = interaction.channelId;
            const userId = interaction.user?.id;
            const history = MEMORY_ENABLED ? loadHistory(channelId, userId) : [];

            const reply = await generateAiReply(query, history);
            if (!reply) {
                return interaction.editReply('The AI did not return a reply. Check the local model service or configuration.');
            }

            if (MEMORY_ENABLED) {
                appendHistory(channelId, userId, 'user', query);
                appendHistory(channelId, userId, 'assistant', reply);
            }

            await interaction.editReply(reply);
        } catch (error) {
            logger.error('AI command failed:', error.message || error);
            await interaction.editReply({
                content: 'An error occurred while asking the local AI. Check the bot logs and your local model endpoint.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
