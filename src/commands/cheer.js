const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const apiEndpoints = [
    'https://nekos.best/api/v2/happy',
    'https://api.waifu.pics/sfw/happy',
    'https://api.waifu.im/search?gif=true&included_tags=happy',
    'https://api.waifu.im/search?gif=true&included_tags=smile'
];

async function getAnimeGif(action) {
    for (const endpoint of apiEndpoints) {
        try {
            const response = await axios.get(endpoint, { timeout: 5000 });
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
        .setName('cheer')
        .setDescription('Send someone some encouragement!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to cheer (optional)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('happy');

        const embed = new EmbedBuilder()
            .setTitle('✨ CHEER!')
            .setDescription(user.id === interaction.user.id ? `${interaction.user} sends some encouragement!` : `${interaction.user} sends some encouragement to ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Stay positive! 💖' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'cheer.gif' });
                embed.setImage('attachment://cheer.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
