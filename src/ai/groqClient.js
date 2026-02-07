const axios = require('axios');
const FormData = require('form-data');

async function chatWithGroq(prompt, options = {}) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured.');
    }

    const model = options.model || 'llama-3.1-8b-instant';
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

    const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model,
            messages: finalMessages,
            temperature: 0.7
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: options.timeoutMs || 20000
        }
    );

    const choice = response.data && response.data.choices && response.data.choices[0];
    const content = choice && choice.message && choice.message.content;
    return typeof content === 'string' ? content : '';
}

async function speechToText(audioBuffer, options = {}) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured.');
    }

    const model = options.model || 'whisper-large-v3';
    const form = new FormData();
    form.append('model', model);
    form.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
    });

    const response = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        form,
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                ...form.getHeaders()
            },
            timeout: options.timeoutMs || 30000
        }
    );

    if (response.data && typeof response.data.text === 'string') {
        return response.data.text.trim();
    }

    return '';
}

async function textToSpeech(text, options = {}) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured.');
    }

    const model = options.model || 'canopylabs/orpheus-v1-english';
    const voice = options.voice || undefined;

    const response = await axios.post(
        'https://api.groq.com/openai/v1/audio/speech',
        {
            model,
            input: text,
            voice,
            response_format: 'wav'
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: options.timeoutMs || 30000
        }
    );

    return Buffer.from(response.data);
}

module.exports = { chatWithGroq, speechToText, textToSpeech };
