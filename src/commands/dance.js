const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const apiEndpoints = [
    'https://purrbot.site/api/img/sfw/dance/gif',
    'https://nekos.best/api/v2/dance',
    'https://nekos.life/api/v2/img/dance',
    'https://api.waifu.im/search?gif=true&included_tags=dancing',
    'https://api.waifu.pics/sfw/dance'
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
        .setName('dance')
        .setDescription('Dance with someone!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to dance with')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't dance with yourself! Find a partner.",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('dance');

        const embed = new EmbedBuilder()
            .setTitle('💃 DANCE!')
            .setDescription(`${interaction.user} and ${user} are dancing together!`)
            .setColor(0x212121)
            .setFooter({ text: 'Let\'s get down! 🎵' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'dance.gif' });
                embed.setImage('attachment://dance.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
