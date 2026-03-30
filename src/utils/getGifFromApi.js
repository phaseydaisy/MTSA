const axios = require('axios');
const logger = require('./logger');

const lastGifCache = {};
const recentGifCache = {};
const RECENT_GIF_LIMIT = 5;
const MAX_CATEGORY_ATTEMPTS = 4;

const FAMILY_ALIASES = {
	disgust: ['disgust', 'disgusted', 'gross', 'ew', 'eww'],
	cringe: ['cringe', 'cringy', 'cringey'],
	facepalm: ['facepalm', 'palmface', 'smh'],
	eat: ['eat', 'eating', 'nom', 'nomming', 'munch', 'chew'],
	psycho: ['psycho', 'insane', 'crazy', 'maniac'],
	teehee: ['teehee', 'giggle', 'giggles'],
	scream: ['scream', 'screaming', 'yell', 'shout'],
	sleep: ['sleep', 'sleepy', 'nap', 'napping', 'bedtime'],
	pout: ['pout', 'pouting'],
	nope: ['nope'],
	shrug: ['shrug', 'shrugging'],
	bored: ['bored'],
	smug: ['smug'],
	poke: ['poke', 'poking'],
	pinch: ['pinch', 'pinching'],
	boop: ['boop', 'touch'],
	lurk: ['lurk', 'lurking'],
	shoot: ['shoot', 'shooting'],
	hug: ['hug', 'hugging'],
	kiss: ['kiss', 'kissing'],
	lick: ['lick', 'licking'],
	fluff: ['fluff'],
	comfy: ['comfy'],
	lay: ['lay', 'lying'],
	tail: ['tail', 'wag'],
	holo: ['holo'],
	ass: ['ass', 'butt', 'booty', 'butts', 'buttcheeks', 'buttocks', 'twerk', 'twerking', 'asswiggle', 'buttshake'],
	kitsune: ['kitsune'],
	senko: ['senko'],
	shiro: ['shiro'],
	stare: ['stare', 'staring'],
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
	yeet: ['yeet'],
	lewd: ['lewd', 'nsfw'],
	hentai: ['hentai', 'ecchi'],
	blowjob: ['blowjob', 'blow_job', 'bj', 'fellatio', 'suck', 'sucking'],
	anal: ['anal'],
	cum: ['cum'],
	fuck: ['fuck', 'fucking'],
	pussylick: ['pussylick', 'kuni'],
	solo: ['solo', 'solo_female'],
	solomale: ['solomale', 'solo_male'],
	threesomefff: ['threesomefff', 'threesome_fff'],
	threesomeffm: ['threesomeffm', 'threesome_ffm'],
	threesomemmf: ['threesomemmf', 'threesome_mmf'],
	yaoi: ['yaoi'],
	yuri: ['yuri'],
	trap: ['trap'],
	neko: ['neko'],
	waifu: ['waifu'],
	happy: ['happy', 'joy', 'joyful'],
	sad: ['sad', 'sorrow'],
	angry: ['angry', 'mad']
};

const EXTRA_ALIASES = {
	shy: 'blush',
	depressed: 'sad',
	nuzzle: 'cuddle',
	pet: 'pat',
	greet: 'wave',
	throw: 'yeet',
	hello: 'wave',
	snuggle: 'cuddle',
	love: 'kiss',
	celebrate: 'happy',
	confused: 'shrug',
	masturbate: 'solo',
	bondage: 'lewd',
	oppai: 'lewd',
	oral: 'blowjob',
	sex: 'fuck'
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
		if (family) {
			if (!resolved.includes(family)) {
				resolved.push(family);
			}
			continue;
		}

		const normalized = normalizeCategory(tag);
		if (normalized && !resolved.includes(normalized)) {
			logger.warn(`Unknown category '${normalized}' for strict map; passing through directly.`);
			resolved.push(normalized);
		}
	}
	return resolved;
}

function rememberGif(commandName, gifUrl) {
	if (!commandName || !gifUrl) return;
	const recent = Array.isArray(recentGifCache[commandName]) ? [...recentGifCache[commandName]] : [];
	const existingIndex = recent.indexOf(gifUrl);
	if (existingIndex !== -1) {
		recent.splice(existingIndex, 1);
	}
	recent.push(gifUrl);
	if (recent.length > RECENT_GIF_LIMIT) {
		recent.shift();
	}
	recentGifCache[commandName] = recent;
	lastGifCache[commandName] = gifUrl;
}

async function getGifFromApi(tags, nsfw = false, commandName = 'default') {
	const lastGif = lastGifCache[commandName];
	const recentGifs = Array.isArray(recentGifCache[commandName]) ? recentGifCache[commandName] : [];
	const strictCategories = getStrictCategories(Array.isArray(tags) ? tags : []);
	if (!strictCategories.length) {
		logger.error(`No strict API categories could be resolved for command: ${commandName}`);
		return lastGif || null;
	}

	let duplicateCandidate = null;

	for (const category of strictCategories) {
		const endpoint = nsfw
			? `https://api.phawse.lol/nsfw/${category}`
			: `https://api.phawse.lol/gif/${category}`;

		let endpointFailed = false;
		let endpointErrorMessage = '';
		for (let attempt = 1; attempt <= MAX_CATEGORY_ATTEMPTS; attempt += 1) {
			try {
				logger.debug(`API Request: ${endpoint} (attempt ${attempt}/${MAX_CATEGORY_ATTEMPTS})`);
				const res = await axios.get(endpoint, { timeout: 5000 });
				if (res.data && (res.data.url || res.data.gif || res.data.image)) {
					const gifUrl = res.data.url || res.data.gif || res.data.image;
					logger.info(`API Success: ${endpoint} -> ${res.status}`);

					if (recentGifs.includes(gifUrl)) {
						logger.debug(`Skipping recent GIF for command: ${commandName}`);
						duplicateCandidate = gifUrl;
						continue;
					}

					rememberGif(commandName, gifUrl);
					return gifUrl;
				}
			} catch (err) {
				endpointFailed = true;
				endpointErrorMessage = err.message;
				logger.warn(`API Failed: https://api.phawse.lol - ${err.message}`);
				break;
			}
		}

		if (endpointFailed) {
			logger.warn(`Primary endpoint failed for category '${category}': ${endpointErrorMessage || 'unknown error'}`);
			if (!nsfw) {
				try {
					const searchEndpoint = `https://api.phawse.lol/sfw/search?q=${encodeURIComponent(category)}`;
					logger.debug(`API Search Request: ${searchEndpoint}`);
					const searchRes = await axios.get(searchEndpoint, { timeout: 5000 });
					if (searchRes.data && (searchRes.data.url || searchRes.data.gif || searchRes.data.image)) {
						const gifUrl = searchRes.data.url || searchRes.data.gif || searchRes.data.image;
						logger.info(`API Search Success: ${searchEndpoint} -> ${searchRes.status}`);

						if (recentGifs.includes(gifUrl)) {
							logger.debug(`Skipping recent search GIF for command: ${commandName}`);
							duplicateCandidate = gifUrl;
							continue;
						}

						rememberGif(commandName, gifUrl);
						return gifUrl;
					}
				} catch (searchErr) {
					logger.warn(`API Search Failed: https://api.phawse.lol - ${searchErr.message}`);
				}
			} else {
				try {
					const searchEndpoint = `https://api.phawse.lol/nsfw/search?q=${encodeURIComponent(category)}`;
					logger.debug(`API NSFW Search Request: ${searchEndpoint}`);
					const searchRes = await axios.get(searchEndpoint, { timeout: 5000 });
					if (searchRes.data && (searchRes.data.url || searchRes.data.gif || searchRes.data.image)) {
						const gifUrl = searchRes.data.url || searchRes.data.gif || searchRes.data.image;
						logger.info(`API NSFW Search Success: ${searchEndpoint} -> ${searchRes.status}`);

						if (recentGifs.includes(gifUrl)) {
							logger.debug(`Skipping recent NSFW search GIF for command: ${commandName}`);
							duplicateCandidate = gifUrl;
							continue;
						}

						rememberGif(commandName, gifUrl);
						return gifUrl;
					}
				} catch (searchErr) {
					logger.warn(`API NSFW Search Failed: https://api.phawse.lol - ${searchErr.message}`);
				}
			}
		}
	}

	if (duplicateCandidate) {
		logger.warn(`Using duplicate GIF fallback for command: ${commandName}`);
		return duplicateCandidate;
	}

	if (recentGifs.length > 1) {
		const rotated = recentGifs[0] === lastGif ? recentGifs[1] : recentGifs[0];
		if (rotated) {
			logger.warn(`Using rotated recent GIF fallback for command: ${commandName}`);
			return rotated;
		}
	}

	if (lastGif) {
		logger.warn(`Using last known GIF fallback for command: ${commandName}`);
		return lastGif;
	}

	logger.error(`All API endpoints failed for command: ${commandName}`);
	return null;
}

module.exports = getGifFromApi;
