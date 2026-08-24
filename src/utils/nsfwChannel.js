const fs = require('fs');
const { resolveDataFile } = require('./dataDir');

const dataFile = resolveDataFile('nsfw-channels.json');

function readChannels() {
    try {
        const contents = fs.readFileSync(dataFile, 'utf8');
        const channels = JSON.parse(contents);
        return channels && typeof channels === 'object' && !Array.isArray(channels) ? channels : {};
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
        return {};
    }
}

function writeChannels(channels) {
    fs.writeFileSync(dataFile, `${JSON.stringify(channels, null, 2)}\n`, 'utf8');
}

function getNsfwChannel(guildId) {
    return readChannels()[guildId] || null;
}

function setNsfwChannel(guildId, channelId) {
    const channels = readChannels();
    channels[guildId] = channelId;
    writeChannels(channels);
}

module.exports = { getNsfwChannel, setNsfwChannel };