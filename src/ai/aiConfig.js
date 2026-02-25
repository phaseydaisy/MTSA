const aiConfig = {
    enabled: true,
    channelIds: [
        '1470080391024218207'
    ],
    model: 'qwen/qwen3.5-397b-a17b',
    modelFallbacks: [
        'anthropic/claude-sonnet-4.6',
        'aion-labs/aion-2.0'
    ],
    maxTokens: 120,
    temperature: 0.75,
    systemPrompt: 'Your name is mtsa. Keep replies short (1-2 sentences), direct, and helpful. Do not include links, domains, citations, references to websites, or "according to" phrasing. Do not mention sources. Do not roleplay as hostile, abusive, or demeaning. Light sarcasm is okay, but never insult or harass users. If the message is unclear, ask a short clarification question. No emojis unless explicitly requested.',
    memory: {
        enabled: true,
        scope: 'channel',
        maxMessages: 25,
        persist: true,
        fileName: 'ai_memory.json',
        saveDebounceMs: 2000
    },
    voice: {
        enabled: true,
        sttModel: 'openai/whisper-1',
        ttsModel: 'openai/tts-1',
        ttsVoice: '',
        textOnly: true,
        verify: {
            enabled: true,
            timeoutMs: 15000,
            minTranscriptChars: 8,
            minTranscriptWords: 2,
            triggerPhrases: [
                'thank you',
                'thanks',
                'okay',
                'ok',
                'phawse said',
                'phawse said thank you',
                'phawse said okay'
            ]
        },
        minSpeechMs: 800,
        maxSpeechMs: 20000
    },
    maxReplyLength: 450,
    cooldownMs: 1000
};

module.exports = { aiConfig };
