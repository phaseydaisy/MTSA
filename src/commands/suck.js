const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'jsons', 'suck_stats.json');
const apiEndpoints = [
    'https://api.purrbot.site/v2/img/nsfw/blowjob/gif',
    'https://api.waifu.pics/nsfw/blowjob'
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

function addSuck(issuerId, targetId) {
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

function getSuckCount(issuerId, targetId) {
    const stats = loadStats();
    const targetStr = targetId.toString();
    const issuerStr = issuerId.toString();

    if (!stats[targetStr]) return 0;
    return stats[targetStr][issuerStr] || 0;
}

async function getAnimeGif(action) {
    for (const endpoint of apiEndpoints) {
        try {
            const headers = endpoint.includes('purrbot') ? { 'User-Agent': 'DiscordBot' } : {};
            const response = await axios.get(endpoint, { timeout: 5000, headers });
            const data = response.data;

            // purrbot format
            if (data.link) return data.link;
            
            // waifu.pics format
            if (data.url) return data.url;
            
            // nekos.best format
            if (data.results && Array.isArray(data.results) && data.results[0]?.url) {
                return data.results[0].url;
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suck')
        .setDescription('Suck someone and track how many times')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to suck')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't suck yourself!",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        addSuck(interaction.user.id, user.id);
        const suckCount = getSuckCount(interaction.user.id, user.id);

        const gifUrl = await getAnimeGif('suck');

        const embed = new EmbedBuilder()
            .setTitle('💋 SUCK!')
            .setDescription(`${interaction.user} has sucked ${user} **${suckCount}** time(s)!`)
            .setColor(0x212121)
            .setFooter({ text: 'Slurp slurp. ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'suck.gif' });
                embed.setImage('attachment://suck.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
