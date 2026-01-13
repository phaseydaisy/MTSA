const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'jsons', 'edge_stats.json');
const phawseAPI = 'https://api.phawse.lol/nsfw/edge';

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

function addEdge(issuerId, targetId) {
    const stats = loadStats();
    const targetStr = targetId.toString();
    const issuerStr = issuerId.toString();

    if (!stats[targetStr]) {
        stats[targetStr] = {};
    }

    if (!stats[targetStr][issuerStr]) {
        stats[targetStr][issuerStr] = 0;
    }

    stats[targetStr][issuerStr] += 1;
    saveStats(stats);
}

function getEdgeCount(issuerId, targetId) {
    const stats = loadStats();
    const targetStr = targetId.toString();
    const issuerStr = issuerId.toString();

    if (!stats[targetStr]) return 0;
    return stats[targetStr][issuerStr] || 0;
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
        .setName('edge')
        .setDescription('Edge someone or yourself and track how many times')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to edge (optional - defaults to yourself)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply();

        addEdge(interaction.user.id, user.id);
        const edgeCount = getEdgeCount(interaction.user.id, user.id);

        const gifUrl = await getAnimeGif();

        const isSelf = user.id === interaction.user.id;
        const description = isSelf 
            ? `${interaction.user} edges themselves **${edgeCount}** time(s)!`
            : `${interaction.user} has edged ${user} **${edgeCount}** time(s)!`;

        const embed = new EmbedBuilder()
            .setTitle('🪢 EDGE!')
            .setDescription(description)
            .setColor(0x212121)
            .setFooter({ text: 'Stay on the edge. ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'edge.gif' });
                embed.setImage('attachment://edge.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
