const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'jsons', 'hug_stats.json');
const phawseAPIEndpoints = [
    'https://api.phawse.lol/gif/hug',
    'https://api.phawse.lol/gif/cuddle',
    'https://api.phawse.lol/gif/snuggle'
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

function addHug(user1Id, user2Id) {
    const stats = loadStats();
    const pairKey = [user1Id.toString(), user2Id.toString()].sort().join('_');

    if (!stats[pairKey]) {
        stats[pairKey] = 0;
    }

    stats[pairKey] += 1;
    saveStats(stats);
}

function getHugCount(user1Id, user2Id) {
    const stats = loadStats();
    const pairKey = [user1Id.toString(), user2Id.toString()].sort().join('_');
    return stats[pairKey] || 0;
}

async function getAnimeGif(action) {
    for (const endpoint of phawseAPIEndpoints) {
        try {
            const response = await axios.get(endpoint, { timeout: 5000 });
            const data = response.data;

            if (data.url) return data.url;
            if (data.gif) return data.gif;
            if (data.image) return data.image;
        } catch (error) {
            continue;
        }
    }
    console.error('All phawse API endpoints failed for hug');
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Give someone a warm hug! (embrace, cuddle, snuggle)', 'affection')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to hug')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't hug yourself! Find someone else to hug.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        addHug(interaction.user.id, user.id);
        const hugCount = getHugCount(interaction.user.id, user.id);

        const gifUrl = await getAnimeGif('hug');

        const embed = new EmbedBuilder()
            .setTitle('🤗 HUG!')
            .setDescription(`${interaction.user} hugs ${user}!\n\n-# ${interaction.user} has hugged ${user} **${hugCount}** times`)
            .setColor(0x212121)
            .setFooter({ text: 'Warm hugs! ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'hug.gif' });
                embed.setImage('attachment://hug.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
