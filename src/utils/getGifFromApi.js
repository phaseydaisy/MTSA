const axios = require('axios');

const lastGifCache = {};

async function getGifFromApi(tags, nsfw = false, commandName = 'default') {
	const lastGif = lastGifCache[commandName];

	for (const tag of tags) {
		try {
			const endpointType = nsfw ? 'nsfw' : 'gif';
			const res = await axios.get(`https://api.phawse.lol/${endpointType}/${tag}`, { timeout: 5000 });
			if (res.data && (res.data.url || res.data.gif || res.data.image)) {
				const gifUrl = res.data.url || res.data.gif || res.data.image;

				if (gifUrl !== lastGif) {
					lastGifCache[commandName] = gifUrl;
					return gifUrl;
				}
			}
		} catch (err) {
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
				continue;
			}
		}
	}

	return null;
}

module.exports = getGifFromApi;
