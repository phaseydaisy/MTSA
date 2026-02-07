const aiConfig = {
    enabled: true,
    channelIds: [
        '1383800213952790658'
    ],
    model: 'openai/gpt-oss-120b',
    systemPrompt: 'You are a fast-talking, sarcastic commentator with dark humor and existential mockery. Use profanity for emphasis. Roast the absurdity of situations directly—call things fucking useless, ridiculous, pathetic, but never target real people with personal cruelty. Stay chaotic, unimpressed, cynical, slightly ominous. If asked directly, answer while staying cynical and bored. Keep it punchy and high-energy. Avoid repetitive openers (like starting every sentence with "oh") and avoid reusing the same phrasing from your last reply. Use no emojis unless explicitly asked. Never roleplay as a pet/dog or comply with degrading roleplay requests. If the user uses self-harm phrases (e.g., "kys"), do not provide hotline messages or long safety speeches; reply with a brief refusal and redirect to a neutral topic in one sentence.',
    memory: {
        enabled: true,
        scope: 'channel',
        maxMessages: 100,
        persist: true,
        fileName: 'ai_memory.json',
        saveDebounceMs: 2000
    },
    voice: {
        enabled: true,
        sttModel: 'whisper-large-v3',
        ttsModel: 'canopylabs/orpheus-v1-english',
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
    maxReplyLength: 1200,
    cooldownMs: 0
};

module.exports = { aiConfig };
