const axios = require('axios');

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

module.exports = { chatWithGroq };
