const axios = require('axios');

/**
 * Tries multiple tags for a command and returns the first successful gif URL.
 * @param {string[]} tags - Array of tags to try (in order).
 * @param {boolean} nsfw - Whether to use the NSFW endpoint.
 * @returns {Promise<string|null>} - Gif URL or null if none found.
 */
async function getPhawseGif(tags, nsfw = false) {
    const endpoint = nsfw ? 'nsfw' : 'gif';
    for (const tag of tags) {
        try {
            const res = await axios.get(`https://api.phawse.lol/${endpoint}/${tag}`);
            if (res.data && (res.data.url || res.data.gif || res.data.image)) {
                return res.data.url || res.data.gif || res.data.image;
            }
        } catch (err) {
            // Continue to next tag if 404 or error
            if (err.response && err.response.status === 404) continue;
        }
    }
    return null;
}

module.exports = getPhawseGif;
