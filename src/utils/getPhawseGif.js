const axios = require('axios');

// Track last returned GIF per command to prevent duplicates
const lastGifCache = {};

/**
 * Tries multiple tags for a command and returns the first successful gif URL.
 * Uses both api.phawse.lol and purrbot API as fallbacks.
 * Avoids returning the same GIF twice in a row.
 * @param {string[]} tags - Array of tags to try (in order).
 * @param {boolean} nsfw - Whether to use the NSFW endpoint.
 * @param {string} commandName - Command name for caching purposes.
 * @returns {Promise<string|null>} 
 */
async function getPhawseGif(tags, nsfw = false, commandName = 'default') {
    const lastGif = lastGifCache[commandName];
    
    for (const tag of tags) {
        // Try api.phawse.lol first
        try {
            const phawseEndpoint = nsfw ? 'nsfw' : 'gif';
            const res = await axios.get(`https://api.phawse.lol/${phawseEndpoint}/${tag}`, { timeout: 5000 });
            if (res.data && (res.data.url || res.data.gif || res.data.image)) {
                const gifUrl = res.data.url || res.data.gif || res.data.image;
                
                if (gifUrl !== lastGif) {
                    lastGifCache[commandName] = gifUrl;
                    return gifUrl;
                }
            }
        } catch (err) {
            // Try purrbot API as fallback
            try {
                const purrbotEndpoint = nsfw ? 'nsfw' : 'sfw';
                const res = await axios.get(`https://api.purrbot.site/v2/img/${purrbotEndpoint}/${tag}/gif`, { timeout: 5000 });
                if (res.data && res.data.link) {
                    const gifUrl = res.data.link;
                    
                    if (gifUrl !== lastGif) {
                        lastGifCache[commandName] = gifUrl;
                        return gifUrl;
                    }
                }
            } catch (purrbotErr) {
                continue; // Try next tag
            }
        }
    }
    return null;
}

module.exports = getPhawseGif;
