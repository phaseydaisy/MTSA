const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'jsons', 'nuzzle_stats.json');
const apiEndpoints = [
    'https://purrbot.site/api/img/sfw/cuddle/gif',
    'https://purrbot.site/api/img/sfw/nuzzle/gif',
    'https://api.waifu.im/search?gif=true&included_tags=cuddle',
    'https://api.waifu.im/search?gif=true&included_tags=affection',
    'https://api.waifu.im/search?gif=true&included_tags=love',
    'https://api.waifu.im/search?gif=true&included_tags=romantic',
    'https://api.waifu.im/search?gif=true&included_tags=happy',
    'https://nekos.life/api/v2/img/nuzzle',
    'https://waifu.pics/api/sfw/cuddle',
    'https://api.waifu.im/search?gif=true&included_tags=smile'
];

function loadStats() {
    try {
        if (fs.existsSync(statsFile)) {
            return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        }
    } catch (error) {}
    return {};
}

function saveStats(stats) {
    try {
        const dir = path.dirname(statsFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');
    } catch (error) {}
}

function addNuzzle(user1Id, user2Id) {
    const stats = loadStats();
    const pairKey = [user1Id.toString(), user2Id.toString()].sort().join('_');

    if (!stats[pairKey]) {
        stats[pairKey] = 0;
    }

    stats[pairKey] += 1;
    saveStats(stats);
}

function getNuzzleCount(user1Id, user2Id) {
    const stats = loadStats();
    const pairKey = [user1Id.toString(), user2Id.toString()].sort().join('_');
    return stats[pairKey] || 0;
}

async function getAnimeGif(action) {
    for (const endpoint of apiEndpoints) {
        try {
            let url;
            if (endpoint.includes('purrbot')) {
                url = endpoint.includes('cuddle') ? endpoint : endpoint.replace(/\/[^\/]+\/gif$/, `/${action}/gif`);
            } else if (endpoint.includes('waifu.im')) {
                url = endpoint;
            } else if (endpoint.includes('waifu.pics')) {
                url = endpoint.includes('cuddle') ? endpoint : `https://api.waifu.pics/sfw/${action}`;
            } else if (endpoint.includes('nekos.life')) {
                url = endpoint;
            } else {
                url = endpoint;
            }

            const response = await axios.get(url, { timeout: 5000 });
            const data = response.data;

            if (data.link) return data.link;
            if (data.url) return data.url;
            if (data.data && Array.isArray(data.data) && data.data[0]?.url) return data.data[0].url;
            if (data.data && data.data.link) return data.data.link;
            if (data.image_url) return data.image_url;
            if (data.images && Array.isArray(data.images) && data.images[0]) return data.images[0];
        } catch (error) {
            continue;
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuzzle')
        .setDescription('Nuzzle someone affectionately!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to nuzzle')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't nuzzle yourself! Find someone else.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        addNuzzle(interaction.user.id, user.id);
        const nuzzleCount = getNuzzleCount(interaction.user.id, user.id);

        const gifUrl = await getAnimeGif('nuzzle');

        const embed = new EmbedBuilder()
            .setTitle('😊 NUZZLE!')
            .setDescription(`${interaction.user} nuzzles ${user}!\n\n-# ${interaction.user} has nuzzled ${user} **${nuzzleCount}** times`)
            .setColor(0x212121)
            .setFooter({ text: 'Cozy vibes! 💕' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'nuzzle.gif' });
                embed.setImage('attachment://nuzzle.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
