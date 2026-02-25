const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

function getOpenRouterHeaders(apiKey) {
    const headers = {
        Authorization: `Bearer ${apiKey}`
    };

    if (process.env.OPENROUTER_SITE_URL) {
        headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
    }

    if (process.env.OPENROUTER_APP_NAME) {
        headers['X-Title'] = process.env.OPENROUTER_APP_NAME;
    }

    return headers;
}

async function chatWithOpenRouter(prompt, options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    const model = options.model || 'anthropic/claude-sonnet-4.6';
    const modelFallbacks = Array.isArray(options.modelFallbacks) ? options.modelFallbacks : [];
    const modelCandidates = [model, ...modelFallbacks]
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index);
    const systemPrompt = options.systemPrompt || '';
    const messages = Array.isArray(options.messages) ? options.messages : [];
    const finalMessages = [];

    if (systemPrompt) {
        finalMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const message of messages) {
        if (!message || !message.role || typeof message.content !== 'string') continue;
        finalMessages.push({ role: message.role, content: message.content });
    }

    finalMessages.push({ role: 'user', content: prompt });

    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    let lastError = null;

    for (const candidate of modelCandidates) {
        try {
            logger.debug(`OpenRouter API Request: ${endpoint} | Model: ${candidate}`);
            const response = await axios.post(
                endpoint,
                {
                    model: candidate,
                    messages: finalMessages,
                    max_tokens: options.maxTokens ?? 120,
                    temperature: options.temperature ?? 0.85,
                    top_p: options.topP ?? 0.9,
                    presence_penalty: options.presencePenalty ?? 0.8,
                    frequency_penalty: options.frequencyPenalty ?? 0.7
                },
                {
                    headers: {
                        ...getOpenRouterHeaders(apiKey),
                        'Content-Type': 'application/json'
                    },
                    timeout: options.timeoutMs || 20000
                }
            );

            logger.info(`OpenRouter API Success: chat completions -> ${response.status} | Model: ${candidate}`);
            const choice = response.data && response.data.choices && response.data.choices[0];
            const content = choice && choice.message && choice.message.content;
            if (typeof content === 'string' && content.trim()) {
                return content;
            }
            logger.warn(`OpenRouter returned empty content for model ${candidate}`);
        } catch (error) {
            lastError = error;
            logger.warn(`OpenRouter API failed for model ${candidate}:`, error.message || error);
        }
    }

    if (lastError) {
        throw lastError;
    }

    return '';
}

async function speechToText(audioBuffer, options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = options.model || 'openai/whisper-1';
    const form = new FormData();
    form.append('model', model);
    form.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
    });

    const endpoint = 'https://openrouter.ai/api/v1/audio/transcriptions';
    if (apiKey) {
        try {
            logger.debug(`OpenRouter API Request: ${endpoint} | Model: ${model}`);
            const response = await axios.post(
                endpoint,
                form,
                {
                    headers: {
                        ...getOpenRouterHeaders(apiKey),
                        ...form.getHeaders()
                    },
                    timeout: options.timeoutMs || 30000
                }
            );

            logger.info(`OpenRouter API Success: speech-to-text -> ${response.status}`);
            if (response.data && typeof response.data.text === 'string') {
                return response.data.text.trim();
            }
        } catch (error) {
            const status = error && error.response ? error.response.status : 'unknown';
            logger.warn(`OpenRouter STT failed (${status}). Trying fallback provider if available.`);
        }
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
        throw new Error('STT unavailable: OpenRouter transcription failed and GROQ_API_KEY is not configured for fallback.');
    }

    const groqModel = options.groqModel || 'whisper-large-v3';
    const groqForm = new FormData();
    groqForm.append('model', groqModel);
    groqForm.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
    });

    const groqEndpoint = 'https://api.groq.com/openai/v1/audio/transcriptions';
    logger.debug(`Groq fallback API Request: ${groqEndpoint} | Model: ${groqModel}`);
    const groqResponse = await axios.post(
        groqEndpoint,
        groqForm,
        {
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                ...groqForm.getHeaders()
            },
            timeout: options.timeoutMs || 30000
        }
    );

    logger.info(`Groq fallback API Success: speech-to-text -> ${groqResponse.status}`);
    if (groqResponse.data && typeof groqResponse.data.text === 'string') {
        return groqResponse.data.text.trim();
    }

    return '';
}

async function textToSpeech(text, options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    const model = options.model || 'canopylabs/orpheus-v1-english';
    const voice = options.voice || undefined;

    const endpoint = 'https://openrouter.ai/api/v1/audio/speech';
    logger.debug(`OpenRouter API Request: ${endpoint} | Model: ${model}`);
    const response = await axios.post(
        endpoint,
        {
            model,
            input: text,
            voice,
            response_format: 'wav'
        },
        {
            headers: {
                ...getOpenRouterHeaders(apiKey),
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: options.timeoutMs || 30000
        }
    );

    logger.info(`OpenRouter API Success: text-to-speech -> ${response.status}`);
    return Buffer.from(response.data);
}

module.exports = { chatWithOpenRouter, speechToText, textToSpeech };
