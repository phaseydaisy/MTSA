const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, EndBehaviorType, StreamType } = require('@discordjs/voice');
const prism = require('prism-media');
const { Readable } = require('stream');
const { speechToText, textToSpeech } = require('./openrouterClient');
const logger = require('../utils/logger');

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
    logger.debug(`Voice transcript received from ${userId}: ${transcript}`);
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
    logger.debug(`Voice capture started for user ${userId} in guild ${session.guildId}`);

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
    let ended = false;

    const finalizeCapture = async () => {
        if (ended) return;
        ended = true;
        session.activeUsers.delete(userId);

        const pcmBuffer = Buffer.concat(pcmChunks);
        if (!pcmBuffer.length) return;

        const minBytes = (48000 * 2 * 2) * (config.minSpeechMs / 1000);
        if (pcmBuffer.length < minBytes) return;

        logger.debug(`Voice capture complete for user ${userId}: ${pcmBuffer.length} bytes`);

        const wavBuffer = pcmToWav(pcmBuffer);

        try {
            const transcript = await speechToText(wavBuffer, { model: config.sttModel });
            if (transcript) {
                await handleTranscript(session, transcript, userId);
            } else {
                logger.debug(`Voice STT returned empty transcript for user ${userId}`);
            }
        } catch (error) {
            logger.error('STT failed:', error.message || error);
        }
    };

    const abortCapture = (reason, error) => {
        if (ended) return;
        ended = true;
        session.activeUsers.delete(userId);
        logger.warn(`Voice capture aborted (${reason}) for user ${userId}:`, error && (error.message || error));

        try {
            opusStream.unpipe(decoder);
        } catch (e) {
            // ignore cleanup errors
        }

        try {
            decoder.destroy();
        } catch (e) {
            // ignore cleanup errors
        }
    };

    decoder.on('data', chunk => {
        totalBytes += chunk.length;
        if (totalBytes > (48000 * 2 * 2) * (config.maxSpeechMs / 1000)) {
            try {
                opusStream.destroy();
            } catch (e) {
                // ignore cleanup errors
            }
            return;
        }
        pcmChunks.push(chunk);
    });

    decoder.on('end', () => {
        finalizeCapture();
    });

    decoder.on('error', error => {
        abortCapture('decoder-error', error);
    });

    opusStream.on('error', error => {
        abortCapture('opus-stream-error', error);
    });

    opusStream.on('end', () => {
        if (ended) return;
        try {
            decoder.end();
        } catch (error) {
            abortCapture('decoder-end-failed', error);
        }
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
    player.on('error', error => {
        logger.error('Voice player error:', error.message || error);
    });

    connection.on('error', error => {
        logger.error('Voice connection error:', error.message || error);
    });

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
        logger.debug(`Voice speaking start event for user ${userId} in guild ${guildId}`);
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
