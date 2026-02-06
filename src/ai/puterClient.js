const axios = require('axios');

async function chatWithPuter(prompt, options = {}) {
    const model = options.model || 'gpt-5-nano';
    const systemPrompt = options.systemPrompt || '';
    const bridgeUrl = options.bridgeUrl;
    const timeoutMs = options.timeoutMs || 20000;

    if (!bridgeUrl) {
        throw new Error('Puter bridge URL not configured.');
    }

    const response = await axios.post(
        `${bridgeUrl}/api/chat`,
        { prompt, model, systemPrompt },
        { timeout: timeoutMs }
    );

    if (response.data && typeof response.data.text === 'string') {
        return response.data.text;
    }

    return String(response.data ?? '');
}

module.exports = { chatWithPuter };
