const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');
const getGifFromApi = require('../utils/getGifFromApi');

const reactionConfigs = {
    blush: {
        title: '😊 BLUSH!',
        endpoints: ['https://api.phawse.lol/gif/blush', 'https://api.phawse.lol/gif/shy', 'https://api.phawse.lol/gif/happy'],
        reactionText: (user) => `${user} is blushing! >///<`
    },
    pout: {
        title: '😤 POUT!',
        endpoints: ['https://api.phawse.lol/gif/pout', 'https://api.phawse.lol/gif/angry', 'https://api.phawse.lol/gif/sad'],
        reactionText: (user) => `${user} is pouting! >:(`
    },
    cry: {
        title: '😭 CRY!',
        endpoints: ['https://api.phawse.lol/gif/cry', 'https://api.phawse.lol/gif/sad', 'https://api.phawse.lol/gif/depressed'],
        reactionText: (user) => `${user} is crying! ;-;`
    },
    laugh: {
        title: '😂 LAUGH!',
        endpoints: ['https://api.phawse.lol/gif/laugh', 'https://api.phawse.lol/gif/happy', 'https://api.phawse.lol/gif/smile'],
        reactionText: (user) => `${user} is laughing! 😂`
    },
    smirk: {
        title: '😏 SMIRK!',
        endpoints: ['https://api.phawse.lol/gif/smirk', 'https://api.phawse.lol/gif/smug', 'https://api.phawse.lol/gif/wink'],
        reactionText: (user) => `${user} smirks...`
    },
    wink: {
        title: '😉 WINK!',
        endpoints: ['https://api.phawse.lol/gif/wink', 'https://api.phawse.lol/gif/smirk', 'https://api.phawse.lol/gif/smug'],
        reactionText: (user) => `${user} winks! 😉`
    },
    stare: {
        title: '👀 STARE!',
        endpoints: ['https://api.phawse.lol/gif/stare', 'https://api.phawse.lol/gif/think', 'https://api.phawse.lol/gif/confused'],
        reactionText: (user) => `${user} is staring... 👁️👁️`
    },
    dance: {
        title: '💃 DANCE!',
        endpoints: ['https://api.phawse.lol/gif/dance', 'https://api.phawse.lol/gif/happy', 'https://api.phawse.lol/gif/celebrate'],
        reactionText: (user) => `${user} is dancing! 💃🕺`
    },
    disgust: {
        title: '🤢 DISGUST!',
        endpoints: ['https://api.phawse.lol/gif/disgust', 'https://api.phawse.lol/gif/disgusted'],
        reactionText: (user) => `${user} looks disgusted... 🤢`
    },
    nope: {
        title: '🙅 NOPE!',
        endpoints: ['https://api.phawse.lol/gif/nope'],
        reactionText: (user) => `${user} says nope.`
    },
    bored: {
        title: '😑 BORED!',
        endpoints: ['https://api.phawse.lol/gif/bored'],
        reactionText: (user) => `${user} looks bored...`
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('react')
        .setDescription('Express your emotions and reactions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('blush')
                .setDescription('Show that you\'re blushing'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pout')
                .setDescription('Show that you\'re pouting'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cry')
                .setDescription('Show that you\'re crying'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('laugh')
                .setDescription('Show that you\'re laughing'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('smirk')
                .setDescription('Smirk at something'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('wink')
                .setDescription('Wink at something'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stare')
                .setDescription('Stare intensely'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dance')
                .setDescription('Show off your dance moves'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disgust')
                .setDescription('Show that you\'re disgusted'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nope')
                .setDescription('Say nope'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bored')
                .setDescription('Show that you are bored'))
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const config = reactionConfigs[subcommand];

        if (!config) {
            return interaction.reply({ content: '❌ Unknown reaction!', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        const tags = config.endpoints
            .map(endpoint => endpoint.split('/').pop())
            .filter(Boolean);

        const gifUrl = await getGifFromApi(tags, false, `react:${subcommand}`);

        const embed = new EmbedBuilder()
            .setTitle(config.title)
            .setDescription(config.reactionText(interaction.user))
            .setColor(0x212121);

        if (gifUrl) {
            try {
                logger.debug(`Downloading GIF: ${gifUrl}`);
                const gifResponse = await axios.get(gifUrl, {
                    responseType: 'arraybuffer',
                    timeout: 7000,
                    maxRedirects: 5
                });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: `${subcommand}.gif` });
                embed.setImage(`attachment://${subcommand}.gif`);
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                logger.error(`Error downloading gif: ${error.message}`);
                embed.setImage(gifUrl);
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
