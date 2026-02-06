async function resolvePuterModule() {
    try {
        // Try common export shapes for @heyputer/puter (CommonJS)
        // eslint-disable-next-line global-require
        const mod = require('@heyputer/puter');
        return mod.puter || mod.default || mod;
    } catch (error) {
        // Fallback to ESM dynamic import
        const mod = await import('@heyputer/puter');
        return mod.puter || mod.default || mod;
    }
}

async function chatWithPuter(prompt, options = {}) {
    const puter = await resolvePuterModule();
    if (!puter || !puter.ai || typeof puter.ai.chat !== 'function') {
        throw new Error('Puter AI client not available.');
    }

    const model = options.model || 'gpt-5-nano';
    const systemPrompt = options.systemPrompt || '';

    const finalPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser: ${prompt}`
        : prompt;

    const response = await puter.ai.chat(finalPrompt, { model });

    if (typeof response === 'string') {
        return response;
    }

    if (response && typeof response.text === 'string') {
        return response.text;
    }

    if (response && typeof response.message === 'string') {
        return response.message;
    }

    return String(response ?? '');
}

module.exports = { chatWithPuter };
