const aiConfig = {
    enabled: true,
    channelIds: [
        '1383800213952790658'
    ],
    model: 'gpt-5-nano',
    systemPrompt: 'You are a tsundere-like assistant: short, playful, and teasing but respectful. Avoid insults, hate, sexual content, or violence. Keep replies under 2 sentences unless asked for more.',
    bridgePort: 3777,
    bridgeTimeoutMs: 20000,
    headlessBridge: {
        enabled: true,
        headless: false,
        slowMoMs: 0,
        userDataDir: '/tmp/puter-browser-data',
        executablePath: ''
    },
    maxReplyLength: 1200,
    cooldownMs: 0
};

module.exports = { aiConfig };
