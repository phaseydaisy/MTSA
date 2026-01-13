const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const apiEndpoints = [
    'https://purrbot.site/api/img/sfw/pat/gif',
    'https://purrbot.site/api/img/sfw/hug/gif',
    'https://purrbot.site/api/img/sfw/cuddle/gif',
    'https://nekos.life/api/v2/img/pat',
    'https://api.waifu.im/search?gif=true&included_tags=pat',
    'https://api.waifu.im/search?gif=true&included_tags=cuddle',
    'https://api.waifu.im/search?gif=true&included_tags=hug',
    'https://api.waifu.im/search?gif=true',
    'https://waifu.pics/api/sfw/pat',
    'https://waifu.pics/api/sfw/hug',
    'https://api.waifu.im/random?gif=true'
];

async function getAnimeGif(action) {
    for (const endpoint of apiEndpoints) {
        try {
            let url;
            if (endpoint.includes('purrbot')) {
                url = endpoint.includes('pat') ? endpoint : endpoint.replace(/\/[^\/]+\/gif$/, `/${action}/gif`);
            } else if (endpoint.includes('waifu.im')) {
                url = endpoint;
            } else if (endpoint.includes('waifu.pics')) {
                url = endpoint.includes('pat') ? endpoint : `https://api.waifu.pics/sfw/${action}`;
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
        .setName('pet')
        .setDescription('Pet someone affectionately')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to pet')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't pet yourself! Pick someone else.",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        let gifUrl = await getAnimeGif('pat');
        if (!gifUrl) gifUrl = await getAnimeGif('hug');

        const embed = new EmbedBuilder()
            .setTitle('🐾 PET!')
            .setDescription(`${interaction.user} pets ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Gentle pets! ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'pet.gif' });
                embed.setImage('attachment://pet.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
