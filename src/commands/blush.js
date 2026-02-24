const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const { resolveDataFile } = require('../utils/dataDir');

const statsFile = resolveDataFile('blush_stats.json');
const gifApiEndpoints = [
    'https://api.phawse.lol/gif/blush',
    'https://api.phawse.lol/gif/shy',
    'https://api.phawse.lol/gif/flustered'
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

function addBlush(userId) {
    const stats = loadStats();

    if (!stats[userId]) {
        stats[userId] = 0;
    }

    stats[userId] += 1;
    saveStats(stats);
}

function getBlushCount(userId) {
    const stats = loadStats();
    return stats[userId] || 0;
}

async function getGifFromApi(category = 'blush') {
    for (const endpoint of gifApiEndpoints) {
        try {
            const response = await axios.get(endpoint, { timeout: 5000 });
            const data = response.data;

            if (data.url || data.gif || data.image) {
                return data.url || data.gif || data.image;
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blush')
        .setDescription('Blush adorably! (shy, embarrassed, flustered)', 'emotions')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        await interaction.deferReply();

        addBlush(interaction.user.id);
        const blushCount = getBlushCount(interaction.user.id);

        const gifUrl = await getGifFromApi('blush');

        const embed = new EmbedBuilder()
            .setTitle('😊 BLUSH!')
            .setDescription(`${interaction.user} is blushing!\n\n-# ${interaction.user} has blushed **${blushCount}** times`)
            .setColor(0xFF69B4)
            .setFooter({ text: 'So cute~ 💕' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'blush.gif' });
                embed.setImage('attachment://blush.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                console.error(`Error downloading gif: ${error.message}`);
                embed.setDescription(`${interaction.user} is blushing!\n\n-# ${interaction.user} has blushed **${blushCount}** times`);
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            embed.setDescription(`${interaction.user} is blushing!\n\n-# ${interaction.user} has blushed **${blushCount}** times`);
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
