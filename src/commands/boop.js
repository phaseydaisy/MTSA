const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const apiEndpoints = [
    'https://purrbot.site/api/img/sfw/pat/gif',
    'https://purrbot.site/api/img/sfw/cuddle/gif',
    'https://nekos.best/api/v2/pat',
    'https://nekos.life/api/v2/img/pat',
    'https://api.waifu.pics/sfw/pat',
    'https://api.waifu.im/search?gif=true&included_tags=pat',
    'https://api.waifu.im/search?gif=true&included_tags=boop'
];

async function getAnimeGif(action) {
    for (const endpoint of apiEndpoints) {
        try {
            let url;
            if (endpoint.includes('purrbot')) {
                url = endpoint;
            } else if (endpoint.includes('waifu.pics')) {
                url = endpoint.includes('/pat') ? endpoint : `https://api.waifu.pics/sfw/${action}`;
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
            if (data.results && Array.isArray(data.results) && data.results[0]?.url) return data.results[0].url;
        } catch (error) {
            continue;
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boop')
        .setDescription('Boop someone on the nose!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to boop')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't boop yourself!",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('pat');

        const embed = new EmbedBuilder()
            .setTitle('👆 BOOP!')
            .setDescription(`${interaction.user} boops ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Boop the snoot! ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'boop.gif' });
                embed.setImage('attachment://boop.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
