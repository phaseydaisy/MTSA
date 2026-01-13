const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'jsons', 'rape_stats.json');
const responses = [
    'violently attacks',
    'aggressively attacks',
    'brutally attacks',
    'forcefully attacks',
    'savagely attacks'
];

const phawseAPI = 'https://api.phawse.lol/gif/slap';

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

function addRape(issuerId, targetId) {
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

function getRapesBy(targetId, issuerId) {
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
        .setName('rape')
        .setDescription('RAPE THEM')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to rape')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't target yourself! Choose someone else.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        addRape(interaction.user.id, user.id);

        let gifUrl = await getAnimeGif('fuck');
        if (!gifUrl) gifUrl = await getAnimeGif('sex');
        if (!gifUrl) gifUrl = await getAnimeGif('rape');

        const actionText = responses[Math.floor(Math.random() * responses.length)];
        const rapeCount = getRapesBy(user.id, interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('💢 RAPE!')
            .setDescription(`${interaction.user} ${actionText} ${user}!\n\n-# ${user} has been raped by ${interaction.user} **${rapeCount}** times`)
            .setColor(0x212121)
            .setFooter({ text: 'Powered by PurrBot API ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'rape.gif' });
                embed.setImage('attachment://rape.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
