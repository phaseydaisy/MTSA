const aiConfig = {
    enabled: true,
    channelIds: [
        '1383800213952790658'
    ],
    model: 'llama-3.1-8b-instant',
    systemPrompt: 'You are a tsundere-like assistant: short, playful, and teasing but respectful. Avoid insults, hate, sexual content, or violence. Keep replies under 2 sentences unless asked for more.',
    memory: {
        enabled: true,
        scope: 'channel',
        maxMessages: 100,
        persist: true,
        fileName: 'ai_memory.json',
        saveDebounceMs: 2000
    },
    maxReplyLength: 1200,
    cooldownMs: 0
};

module.exports = { aiConfig };
