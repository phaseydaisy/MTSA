const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, EndBehaviorType, StreamType } = require('@discordjs/voice');
const prism = require('prism-media');
const { Readable } = require('stream');
const { speechToText, textToSpeech } = require('./groqClient');

const sessions = new Map();
let responseHandler = null;
let config = {
    sttModel: 'whisper-large-v3',
    ttsModel: 'canopylabs/orpheus-v1-english',
    ttsVoice: '',
    textOnly: false,
    minSpeechMs: 800,
    maxSpeechMs: 20000,
    botUserId: ''
};

function setResponseHandler(handler) {
    responseHandler = handler;
}

function setVoiceConfig(options = {}) {
    config = {
        ...config,
        ...options
    };
}

function pcmToWav(pcmBuffer, options = {}) {
    const channels = options.channels || 2;
    const sampleRate = options.sampleRate || 48000;
    const bitsPerSample = 16;
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const dataSize = pcmBuffer.length;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
}

function getSession(guildId) {
    return sessions.get(guildId);
}

async function handleTranscript(session, transcript, userId) {
    if (!responseHandler) return;
    const reply = await responseHandler({
        guildId: session.guildId,
        userId,
        text: transcript,
        textChannelId: session.textChannelId,
        voiceChannelId: session.voiceChannelId
    });
    if (config.textOnly) return;
    if (!reply) return;

    const audio = await textToSpeech(reply, {
        model: config.ttsModel,
        voice: config.ttsVoice
    });
    const stream = Readable.from(audio);
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    session.player.play(resource);
}

function subscribeToUser(session, userId) {
    if (userId === config.botUserId) return;
    if (session.activeUsers.has(userId)) return;

    session.activeUsers.add(userId);

    const opusStream = session.receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 800
        }
    });

    const decoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 2,
        frameSize: 960
    });

    const pcmChunks = [];
    let totalBytes = 0;

    decoder.on('data', chunk => {
        totalBytes += chunk.length;
        if (totalBytes > (48000 * 2 * 2) * (config.maxSpeechMs / 1000)) {
            return;
        }
        pcmChunks.push(chunk);
    });

    decoder.on('end', async () => {
        session.activeUsers.delete(userId);

        const pcmBuffer = Buffer.concat(pcmChunks);
        if (!pcmBuffer.length) return;

        const minBytes = (48000 * 2 * 2) * (config.minSpeechMs / 1000);
        if (pcmBuffer.length < minBytes) return;

        const wavBuffer = pcmToWav(pcmBuffer);

        try {
            const transcript = await speechToText(wavBuffer, { model: config.sttModel });
            if (transcript) {
                await handleTranscript(session, transcript, userId);
            }
        } catch (error) {
            console.error('STT failed:', error.message || error);
        }
    });

    opusStream.on('error', () => {
        session.activeUsers.delete(userId);
    });

    opusStream.pipe(decoder);
}

async function joinVoice(options) {
    const voiceChannel = options && options.voiceChannel ? options.voiceChannel : null;
    if (!voiceChannel) return false;
    const guildId = voiceChannel.guild.id;
    const existing = getVoiceConnection(guildId);
    if (existing) return true;

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    const session = {
        guildId,
        connection,
        receiver: connection.receiver,
        player,
        voiceChannelId: options.voiceChannelId || voiceChannel.id,
        textChannelId: options.textChannelId || null,
        activeUsers: new Set()
    };

    sessions.set(guildId, session);

    session.receiver.speaking.on('start', userId => {
        subscribeToUser(session, userId);
    });

    return true;
}

async function leaveVoice(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
    }
    sessions.delete(guildId);
}

module.exports = {
    joinVoice,
    leaveVoice,
    setResponseHandler,
    setVoiceConfig
};
