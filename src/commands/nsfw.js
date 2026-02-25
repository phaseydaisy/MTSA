const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');
const getGifFromApi = require('../utils/getGifFromApi');

// Rape command variations
const rapeResponses = [
    'violently rapes',
    'aggressively rapes',
    'brutally rapes',
    'forcefully rapes',
    'savagely rapes'
];

// Horny level configuration
const levelMessages = {
    '0-10': [
        'practically asexual 😴',
        'touch grass energy 🌱',
        'pure and innocent ✨',
        'not even slightly interested 😐',
        'completely unphased 🗿'
    ],
    '11-25': [
        'barely curious 🤔',
        'mildly interested 👀',
        'starting to wake up 😌',
        'somewhat aware 🙂',
        'slightly intrigued 😊'
    ],
    '26-40': [
        'getting warmed up 😏',
        'things are stirring 😳',
        'notably interested 👁️',
        'moderately curious 🤨',
        'attention grabbed 😯'
    ],
    '41-60': [
        'definitely horny 😈',
        'things are heating up 🔥',
        'quite aroused 😏',
        'significantly interested 🥴',
        'getting there 😩'
    ],
    '61-75': [
        'very horny 🥵',
        'down bad territory 💦',
        'seriously aroused 😫',
        'extremely interested 🤤',
        'losing control 😵'
    ],
    '76-90': [
        'dangerously horny 🔥💀',
        'critical levels reached ⚠️',
        'absolutely feral 🐺',
        'out of control 🌋',
        'maximum overdrive 🚨'
    ],
    '91-100': [
        'MAXIMUM HORNY 💥💦🔥',
        'OFF THE CHARTS 📈💀',
        'NEEDS IMMEDIATE HELP 🚑',
        'ABSOLUTELY UNHINGED 🤯',
        'TERMINAL HORNY STAGE 💀💀💀'
    ]
};

function getHornyBar(percentage) {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}%`;
}

function getEmbedColor(percentage) {
    if (percentage <= 25) return 0x3498DB;
    if (percentage <= 50) return 0x2ECC71;
    if (percentage <= 75) return 0xE67E22;
    return 0xE74C3C;
}

function getLevelMessage(percentage) {
    for (const [range, messages] of Object.entries(levelMessages)) {
        const [low, high] = range.split('-').map(Number);
        if (percentage >= low && percentage <= high) {
            return messages[Math.floor(Math.random() * messages.length)];
        }
    }
    return 'unknown status 🤷';
}

const nsfwConfigs = {
    rape: {
        title: '💢 RAPE!',
        endpoints: ['https://api.phawse.lol/nsfw/fuck'],
        actionText: (user, target) => {
            const action = rapeResponses[Math.floor(Math.random() * rapeResponses.length)];
            return `${user} ${action} ${target}!`;
        },
        requiresTarget: true,
        selfError: "❌ You can't target yourself! Choose someone else."
    },
    suck: {
        title: '💋 SUCK!',
        endpoints: ['https://api.phawse.lol/nsfw/blowjob', 'https://api.phawse.lol/nsfw/suck', 'https://api.phawse.lol/nsfw/oral'],
        actionText: (user, target) => `${user} sucks ${target}!`,
        requiresTarget: true,
        selfError: "❌ You can't suck yourself!"
    },
    spank: {
        title: '👋 SPANK!',
        endpoints: ['https://api.phawse.lol/nsfw/bondage', 'https://api.phawse.lol/nsfw/sex', 'https://api.phawse.lol/nsfw/oppai'],
        actionText: (user, target) => `${user} spanks ${target}!`,
        requiresTarget: true,
        selfError: "❌ You can't spank yourself! Choose someone else."
    },
    edge: {
        title: '🪢 EDGE!',
        tags: ['masturbate', 'ecchi', 'tease', 'solomale', 'solo'],
        actionText: (user, target) => target ? `${user} edges ${target}!` : `${user} edges themselves!`,
        requiresTarget: false
    }
};

async function sendEmbedWithGif(interaction, embed, gifUrl, fileName) {
    if (!gifUrl) {
        await interaction.followUp({ embeds: [embed] });
        return;
    }

    try {
        logger.debug(`Downloading GIF: ${gifUrl}`);
        const gifResponse = await axios.get(gifUrl, {
            responseType: 'arraybuffer',
            timeout: 7000,
            maxRedirects: 5
        });
        const attachment = new AttachmentBuilder(gifResponse.data, { name: fileName });
        embed.setImage(`attachment://${fileName}`);
        await interaction.followUp({ embeds: [embed], files: [attachment] });
    } catch (error) {
        logger.error(`Error downloading gif: ${error.message}`);
        embed.setImage(gifUrl);
        await interaction.followUp({ embeds: [embed] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nsfw')
        .setDescription('NSFW commands (18+)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('rape')
                .setDescription('Playfully attack someone! (aggressive roleplay)')
                .addUserOption(option => option.setName('user').setDescription('The user you want to rape').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('suck')
                .setDescription('Suck someone 🔞 (oral, pleasure)')
                .addUserOption(option => option.setName('user').setDescription('The user you want to suck').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('spank')
                .setDescription('SPANK THEM')
                .addUserOption(option => option.setName('user').setDescription('The user you want to spank').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edge')
                .setDescription('Edge someone or yourself')
                .addUserOption(option => option.setName('user').setDescription('The user you want to edge (optional - defaults to yourself)').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('horny')
                .setDescription('Check the horny level 🔞 (arousal rating)')
                .addUserOption(option => option.setName('user').setDescription('The user to check (optional - checks yourself if not specified)').setRequired(false)))
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'horny') {
            const target = interaction.options.getUser('user') || interaction.user;
            const percentage = Math.floor(Math.random() * 101);

            await interaction.deferReply();

            const bar = getHornyBar(percentage);
            const message = getLevelMessage(percentage);
            const color = getEmbedColor(percentage);

            const hornyEndpoints = [
                'https://api.phawse.lol/nsfw/oppai',
                'https://api.phawse.lol/nsfw/sex',
                'https://api.phawse.lol/nsfw/bondage'
            ];

            const hornyTags = hornyEndpoints
                .map(endpoint => endpoint.split('/').pop())
                .filter(Boolean);
            const gifUrl = await getGifFromApi(hornyTags, true, 'nsfw:horny');

            const embed = new EmbedBuilder()
                .setTitle(`🔥 ${target.username}'s Horny Level`)
                .setDescription(`${target} is **${message}**`)
                .setColor(color)
                .addFields({ name: 'Level', value: bar, inline: false });

            await sendEmbedWithGif(interaction, embed, gifUrl, 'horny.gif');
            return;
        }

        if (subcommand === 'edge') {
            const user = interaction.options.getUser('user') || interaction.user;

            await interaction.deferReply();

            const gifUrl = await getGifFromApi(['masturbate', 'ecchi', 'tease'], true, 'edge');

            const isSelf = user.id === interaction.user.id;
            const description = isSelf 
                ? `${interaction.user} edges themselves!`
                : `${interaction.user} edges ${user}!`;

            const embed = new EmbedBuilder()
                .setTitle('🪢 EDGE!')
                .setDescription(description)
                .setColor(0x212121);

            await sendEmbedWithGif(interaction, embed, gifUrl, 'edge.gif');
            return;
        }

        // Handle other NSFW commands
        const config = nsfwConfigs[subcommand];
        const user = interaction.options.getUser('user');

        if (!config) {
            return interaction.reply({ content: '❌ Unknown NSFW command!', flags: MessageFlags.Ephemeral });
        }

        if (config.requiresTarget && !user) {
            return interaction.reply({ content: '❌ You must specify a user!', flags: MessageFlags.Ephemeral });
        }

        if (config.selfError && user && user.id === interaction.user.id) {
            return interaction.reply({ content: config.selfError, flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        const tags = config.endpoints
            .map(endpoint => endpoint.split('/').pop())
            .filter(Boolean);
        const gifUrl = await getGifFromApi(tags, true, `nsfw:${subcommand}`);

        const embed = new EmbedBuilder()
            .setTitle(config.title)
            .setDescription(config.actionText(interaction.user, user))
            .setColor(0x212121);

        await sendEmbedWithGif(interaction, embed, gifUrl, `${subcommand}.gif`);
    }
};
