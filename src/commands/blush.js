const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const { resolveDataFile } = require('../utils/dataDir');

const statsFile = resolveDataFile('blush_stats.json');
const phawseAPI = 'https://api.phawse.lol/gif/blush';

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

async function getPhawseGif(category = 'blush') {
    try {
        const response = await axios.get(`https://api.phawse.lol/gif/${category}`, { timeout: 5000 });
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
        .setName('blush')
        .setDescription('Blush adorably! (shy, embarrassed, flustered)', 'emotions')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        await interaction.deferReply();

        addBlush(interaction.user.id);
        const blushCount = getBlushCount(interaction.user.id);

        const gifUrl = await getPhawseGif('blush');

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
                embed.setDescription(`${interaction.user} is blushing!\n\n-# ${interaction.user} has blushed **${blushCount}** times\n\n*[Using phawse.lol API]*`);
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            embed.setDescription(`${interaction.user} is blushing!\n\n-# ${interaction.user} has blushed **${blushCount}** times\n\n*[Using phawse.lol API]*`);
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
