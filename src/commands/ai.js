const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const MEMORY_FILE = path.join(__dirname, '..', 'jsons', 'ai_memory.json');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';

const USE_OPENROUTER = Boolean(OPENROUTER_API_KEY);

const LOCAL_AI_URL = process.env.LOCAL_AI_URL || process.env.AI_URL;

const AI_SERVICE_URL = USE_OPENROUTER
    ? OPENROUTER_BASE_URL
    : (LOCAL_AI_URL || 'http://127.0.0.1:8000/v1/chat/completions');

const DEFAULT_MODEL = process.env.AI_MODEL || (USE_OPENROUTER ? OPENROUTER_MODEL : 'llama2:7b');
const VALIDATION_MODEL = process.env.AI_VALIDATION_MODEL || DEFAULT_MODEL;

const MEMORY_ENABLED = true;
const MEMORY_SCOPE = 'channel';
const MAX_MEMORY_MESSAGES = 16;

let aiMemory = loadMemory();

/* ---------------- MEMORY ---------------- */

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_FILE)) return {};
        const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        logger.error('Memory load error:', err);
        return {};
    }
}

function saveMemory() {
    try {
        fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(aiMemory, null, 2));
    } catch (err) {
        logger.error('Memory save error:', err);
    }
}

function getKey(channelId, userId) {
    return MEMORY_SCOPE === 'user' ? `${channelId}:${userId}` : channelId;
}

function loadHistory(channelId, userId) {
    return aiMemory[getKey(channelId, userId)] || [];
}

function saveHistory(channelId, userId, history) {
    aiMemory[getKey(channelId, userId)] = history.slice(-MAX_MEMORY_MESSAGES);
    saveMemory();
}

function appendHistory(channelId, userId, role, content) {
    const history = loadHistory(channelId, userId);
    history.push({ role, content });
    saveHistory(channelId, userId, history);
}

/* ---------------- PERSONALITY ---------------- */

function buildSystemPrompt() {
    return `You are mtsa.

A dry, low-energy Discord teen.

PERSONALITY:
- blunt
- slightly sarcastic
- minimal effort vibe
- no corporate tone
- acts mildly bored but still responds

RULES:
- keep responses short (1–3 sentences usually)
- NEVER respond with only "..." or only "idk"
- ALWAYS give an actual answer
- no greetings or intros
- no emojis
- no follow-up questions unless required

TONE:
You are not helpful assistant energy.
You are a tired Discord user replying between tabs.`;
}

function buildReasoningInstruction() {
    return `Task handling rules:
- understand intent
- ignore greetings
- remove fluff
- DO NOT delete the actual answer content
- DO NOT over-shorten responses
- respond directly and clearly`;
}

function buildValidationInstruction() {
    return `You are a style cleaner.

RULES:
- keep meaning intact
- remove greetings and filler
- keep answers short but NOT empty
- NEVER reduce responses to "..." or single words unless unavoidable
- do NOT add friendliness or enthusiasm
- do NOT rewrite into a chatbot tone

Output only cleaned response.`;
}

/* ---------------- MESSAGES ---------------- */

function buildMessageBatch(query, history) {
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'system', content: buildReasoningInstruction() }
    ];

    for (const msg of history.slice(-MAX_MEMORY_MESSAGES)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push(msg);
        }
    }

    messages.push({ role: 'user', content: query });
    return messages;
}

function buildValidationBatch(query, reply) {
    return [
        { role: 'system', content: buildValidationInstruction() },
        { role: 'user', content: `Q: ${query}\nA: ${reply}` }
    ];
}

/* ---------------- AI CALL ---------------- */

async function callAI(messages, model) {
    if (USE_OPENROUTER) {
        const res = await axios.post(AI_SERVICE_URL, {
            model,
            messages,
            temperature: 0.5,
            max_tokens: 400
        }, {
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return res.data?.choices?.[0]?.message?.content?.trim();
    }

    const prompt = messages.map(m => {
        if (m.role === 'system') return `SYSTEM: ${m.content}`;
        if (m.role === 'user') return `USER: ${m.content}`;
        return `ASSISTANT: ${m.content}`;
    }).join('\n\n');

    const res = await axios.post(AI_SERVICE_URL, {
        model,
        prompt,
        stream: false,
        options: {
            temperature: 0.5,
            num_predict: 400
        }
    });

    return res.data?.response?.trim();
}

/* ---------------- GENERATION ---------------- */

async function generateReply(query, history) {
    const base = await callAI(buildMessageBatch(query, history), DEFAULT_MODEL);
    if (!base) return "no idea.";

    const final = await callAI(buildValidationBatch(query, base), VALIDATION_MODEL);
    return final || base;
}

async function generateAiResponse(query, channelId, userId) {
    const history = MEMORY_ENABLED ? loadHistory(channelId, userId) : [];
    const reply = await generateReply(query, history);

    if (MEMORY_ENABLED) {
        appendHistory(channelId, userId, 'user', query);
        appendHistory(channelId, userId, 'assistant', reply);
    }

    return reply;
}

/* ---------------- COMMAND ---------------- */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('dry teen discord ai')
        .addStringOption(o =>
            o.setName('query')
                .setDescription('ask something')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const query = interaction.options.getString('query', true);

        try {
            const history = MEMORY_ENABLED
                ? loadHistory(interaction.channelId, interaction.user.id)
                : [];

            const reply = await generateReply(query, history);

            if (MEMORY_ENABLED) {
                appendHistory(interaction.channelId, interaction.user.id, 'user', query);
                appendHistory(interaction.channelId, interaction.user.id, 'assistant', reply);
            }

            await interaction.editReply(reply);
        } catch (err) {
            logger.error(err);
            await interaction.editReply("broken.");
        }
    },

    generateAiResponse
};