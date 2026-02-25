const axios = require('axios');
const logger = require('./logger');

const lastGifCache = {};

const FAMILY_ALIASES = {
	disgust: ['disgust', 'disgusted', 'gross', 'ew', 'eww'],
	cringe: ['cringe', 'cringy', 'cringey'],
	hug: ['hug', 'hugging'],
	kiss: ['kiss', 'kissing'],
	pat: ['pat', 'patting', 'headpat', 'pats'],
	slap: ['slap', 'slapping'],
	smile: ['smile', 'smiling'],
	cry: ['cry', 'crying'],
	laugh: ['laugh', 'laughing'],
	wave: ['wave', 'waving'],
	wink: ['wink', 'winking'],
	dance: ['dance', 'dancing'],
	blush: ['blush', 'blushing'],
	punch: ['punch', 'punching'],
	kick: ['kick', 'kicking'],
	bite: ['bite', 'biting'],
	cuddle: ['cuddle', 'cuddling'],
	tickle: ['tickle', 'tickling'],
	handhold: ['handhold', 'handholding'],
	highfive: ['highfive'],
	happy: ['happy', 'joy', 'joyful'],
	sad: ['sad', 'sorrow'],
	angry: ['angry', 'mad']
};

const EXTRA_ALIASES = {
	shy: 'blush',
	depressed: 'sad',
	smug: 'cringe',
	confused: 'cringe',
	celebrate: 'happy',
	pout: 'angry',
	smirk: 'wink',
	stare: 'angry',
	nuzzle: 'cuddle',
	pet: 'pat',
	lick: 'kiss',
	poke: 'punch',
	pinch: 'punch',
	boop: 'pat',
	greet: 'wave',
	cheer: 'happy',
	hello: 'wave',
	love: 'kiss',
	snuggle: 'cuddle',
	sex: 'angry',
	bondage: 'angry',
	oppai: 'happy',
	blowjob: 'kiss',
	oral: 'kiss',
	masturbate: 'happy',
	ecchi: 'cringe',
	tease: 'cringe'
};

const aliasToFamilyMap = Object.entries(FAMILY_ALIASES).reduce((acc, [family, aliases]) => {
	acc[family] = family;
	for (const alias of aliases) {
		acc[alias] = family;
	}
	return acc;
}, {});

function normalizeCategory(category) {
	return String(category || '').trim().toLowerCase();
}

function resolveFamily(category) {
	const normalized = normalizeCategory(category);
	if (!normalized) return null;
	if (aliasToFamilyMap[normalized]) return aliasToFamilyMap[normalized];
	if (EXTRA_ALIASES[normalized]) return EXTRA_ALIASES[normalized];
	return null;
}

function getStrictCategories(tags) {
	const resolved = [];
	for (const tag of tags) {
		const family = resolveFamily(tag);
		if (family && !resolved.includes(family)) {
			resolved.push(family);
		}
	}
	return resolved;
}

async function getGifFromApi(tags, nsfw = false, commandName = 'default') {
	const lastGif = lastGifCache[commandName];
	const strictCategories = getStrictCategories(Array.isArray(tags) ? tags : []);
	if (!strictCategories.length) {
		logger.error(`No strict API categories could be resolved for command: ${commandName}`);
		return lastGif || null;
	}

	let duplicateCandidate = null;

	for (const category of strictCategories) {
		try {
			const endpoint = nsfw
				? `https://api.phawse.lol/nsfw/${category}`
				: `https://api.phawse.lol/gif/${category}`;
			logger.debug(`API Request: ${endpoint}`);
			const res = await axios.get(endpoint, { timeout: 5000 });
			if (res.data && (res.data.url || res.data.gif || res.data.image)) {
				const gifUrl = res.data.url || res.data.gif || res.data.image;
				logger.info(`API Success: ${endpoint} -> ${res.status}`);

				if (gifUrl !== lastGif) {
					lastGifCache[commandName] = gifUrl;
					return gifUrl;
				}

				duplicateCandidate = gifUrl;
			}
		} catch (err) {
			logger.warn(`API Failed: https://api.phawse.lol - ${err.message}`);
			if (!nsfw) {
				try {
					const searchEndpoint = `https://api.phawse.lol/search?q=${encodeURIComponent(category)}`;
					logger.debug(`API Search Request: ${searchEndpoint}`);
					const searchRes = await axios.get(searchEndpoint, { timeout: 5000 });
					if (searchRes.data && (searchRes.data.url || searchRes.data.gif || searchRes.data.image)) {
						const gifUrl = searchRes.data.url || searchRes.data.gif || searchRes.data.image;
						logger.info(`API Search Success: ${searchEndpoint} -> ${searchRes.status}`);

						if (gifUrl !== lastGif) {
							lastGifCache[commandName] = gifUrl;
							return gifUrl;
						}

						duplicateCandidate = gifUrl;
					}
				} catch (searchErr) {
					logger.warn(`API Search Failed: https://api.phawse.lol - ${searchErr.message}`);
				}
			}

			try {
				const purrbotEndpoint = nsfw ? 'nsfw' : 'sfw';
				const fallbackEndpoint = `https://api.purrbot.site/v2/img/${purrbotEndpoint}/${category}/gif`;
				logger.debug(`API Fallback Request: ${fallbackEndpoint}`);
				const res = await axios.get(fallbackEndpoint, { timeout: 5000 });
				if (res.data && res.data.link) {
					const gifUrl = res.data.link;
					logger.info(`API Fallback Success: ${fallbackEndpoint} -> ${res.status}`);

					if (gifUrl !== lastGif) {
						lastGifCache[commandName] = gifUrl;
						return gifUrl;
					}

					duplicateCandidate = gifUrl;
				}
			} catch (purrbotErr) {
				logger.warn(`API Fallback Failed: https://api.purrbot.site - ${purrbotErr.message}`);
				continue;
			}
		}
	}

	if (duplicateCandidate) {
		logger.warn(`Using duplicate GIF fallback for command: ${commandName}`);
		return duplicateCandidate;
	}

	if (lastGif) {
		logger.warn(`Using last known GIF fallback for command: ${commandName}`);
		return lastGif;
	}

	logger.error(`All API endpoints failed for command: ${commandName}`);
	return null;
}

module.exports = getGifFromApi;
