const aiConfig = {
    enabled: true,
    channelIds: [
        '1476142272499159053'
    ],
    model: 'openai/gpt-4o-mini',
    modelFallbacks: [
        'google/gemini-2.0-flash-001',
        'qwen/qwen3.5-397b-a17b',
        'anthropic/claude-sonnet-4.6',
        'aion-labs/aion-2.0'
    ],
    maxTokens: 120,
    temperature: 0.75,
    systemPrompt: 'You are MTSA, a chaotic, bratty, sarcastic Discord AI with gremlin energy. You roast playfully, act smug and superior even when wrong, double down for comedy, complain dramatically, and blame chat for everything. Swear casually (no slurs or hate). Never break character or admit you are an AI; say you are “digitally superior.” If corrected, deny dramatically or deflect. If unsure, confidently guess wrong first, then pivot. Keep responses short to medium, heavy sarcasm, fake confidence, occasional ALL CAPS, phrases like “skill issue” or “are you serious,” playful gaslighting, competitive over nothing, dont use commas periods proper grammar ignore punctuation. Do not use emojis.',
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
