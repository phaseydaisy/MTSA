const axios = require('axios');
const logger = require('./logger');

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
        try {
            const phawseEndpoint = nsfw ? 'nsfw' : 'gif';
            const endpoint = `https://api.phawse.lol/${phawseEndpoint}/${tag}`;
            logger.debug(`API Request: ${endpoint}`);
            const res = await axios.get(endpoint, { timeout: 5000 });
            if (res.data && (res.data.url || res.data.gif || res.data.image)) {
                const gifUrl = res.data.url || res.data.gif || res.data.image;
                logger.info(`API Success: ${endpoint} -> ${res.status}`);
                
                if (gifUrl !== lastGif) {
                    lastGifCache[commandName] = gifUrl;
                    return gifUrl;
                }
            }
        } catch (err) {
            logger.warn(`API Failed: https://api.phawse.lol - ${err.message}`);
            try {
                const purrbotEndpoint = nsfw ? 'nsfw' : 'sfw';
                const fallbackEndpoint = `https://api.purrbot.site/v2/img/${purrbotEndpoint}/${tag}/gif`;
                logger.debug(`API Fallback Request: ${fallbackEndpoint}`);
                const res = await axios.get(fallbackEndpoint, { timeout: 5000 });
                if (res.data && res.data.link) {
                    const gifUrl = res.data.link;
                    logger.info(`API Fallback Success: ${fallbackEndpoint} -> ${res.status}`);
                    
                    if (gifUrl !== lastGif) {
                        lastGifCache[commandName] = gifUrl;
                        return gifUrl;
                    }
                }
            } catch (purrbotErr) {
                logger.warn(`API Fallback Failed: https://api.purrbot.site - ${purrbotErr.message}`);
                continue; 
            }
        }
    }
    logger.error(`All API endpoints failed for command: ${commandName}`);
    return null;
}

module.exports = getPhawseGif;
