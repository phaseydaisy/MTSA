const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'jsons', 'punch_stats.json');
const apiEndpoints = [
    'https://purrbot.site/api/img/sfw/punch/gif',
    'https://api.waifu.im/search?gif=true&included_tags=punch',
    'https://api.waifu.im/search?gif=true&included_tags=fight',
    'https://api.waifu.im/search?gif=true&included_tags=hit',
    'https://api.waifu.im/search?gif=true&included_tags=attack',
    'https://api.waifu.im/search?gif=true&included_tags=action',
    'https://waifu.pics/api/sfw/punch',
    'https://api.waifu.im/search?gif=true&included_tags=combat',
    'https://api.waifu.im/random?gif=true&included_tags=punch'
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

function addPunch(user1Id, user2Id) {
    const stats = loadStats();
    const pairKey = [user1Id.toString(), user2Id.toString()].sort().join('_');

    if (!stats[pairKey]) {
        stats[pairKey] = 0;
    }

    stats[pairKey] += 1;
    saveStats(stats);
}

function getPunchCount(user1Id, user2Id) {
    const stats = loadStats();
    const pairKey = [user1Id.toString(), user2Id.toString()].sort().join('_');
    return stats[pairKey] || 0;
}

async function getAnimeGif(action) {
    for (const endpoint of apiEndpoints) {
        try {
            let url;
            if (endpoint.includes('purrbot')) {
                url = endpoint.includes('punch') ? endpoint : endpoint.replace(/\/[^\/]+\/gif$/, `/${action}/gif`);
            } else if (endpoint.includes('waifu.im')) {
                url = endpoint;
            } else if (endpoint.includes('waifu.pics')) {
                url = endpoint.includes('punch') ? endpoint : `https://api.waifu.pics/sfw/${action}`;
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
        .setName('punch')
        .setDescription('Playfully punch someone!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to punch')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't punch yourself! That's silly.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        addPunch(interaction.user.id, user.id);
        const punchCount = getPunchCount(interaction.user.id, user.id);

        const gifUrl = await getAnimeGif('punch');

        const embed = new EmbedBuilder()
            .setTitle('👊 PUNCH!')
            .setDescription(`${interaction.user} punches ${user}!\n\n-# ${interaction.user} has punched ${user} **${punchCount}** times`)
            .setColor(0x212121)
            .setFooter({ text: 'Ouch! 💥' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'punch.gif' });
                embed.setImage('attachment://punch.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
