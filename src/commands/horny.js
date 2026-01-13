const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPI = 'https://api.phawse.lol/nsfw/oppai';

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

async function getAnimeGif(action) {
    try {
        const response = await axios.get(phawseAPI, { timeout: 5000 });
        const data = response.data;

        if (data.url) return data.url;
        if (data.gif) return data.gif;
        if (data.image) return data.image;
        
        return null;
    } catch (error) {
        console.error(`Error fetching from phawse API: ${error.message}`);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('horny-level')
        .setDescription('Check the horny level')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (optional - checks yourself if not specified)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const percentage = Math.floor(Math.random() * 101);

        await interaction.deferReply();

        const bar = getHornyBar(percentage);
        const message = getLevelMessage(percentage);
        const color = getEmbedColor(percentage);
        const gifUrl = await getAnimeGif('horny');

        const embed = new EmbedBuilder()
            .setTitle(`🔥 ${target.username}'s Horny Level`)
            .setDescription(`${target} is **${message}**`)
            .setColor(color)
            .addFields({ name: 'Level', value: bar, inline: false });

        if (percentage >= 90) {
            embed.setFooter({ text: '⚠️ WARNING: CRITICAL LEVELS DETECTED' });
        } else if (percentage >= 75) {
            embed.setFooter({ text: '🔥 Dangerously high levels' });
        } else if (percentage >= 50) {
            embed.setFooter({ text: '😏 Getting spicy' });
        } else {
            embed.setFooter({ text: '✨ Perfectly normal' });
        }

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'horny.gif' });
                embed.setImage('attachment://horny.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
