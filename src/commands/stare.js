const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const phawseAPI = 'https://api.phawse.lol/gif/stare';



async function getAnimeGif(action) {
    try {
        const response = await axios.get(phawseAPI, { timeout: 5000 });
        const data = response.data;

        if (data.link) return data.link;
        if (data.url) return data.url;
        if (data.data && Array.isArray(data.data) && data.data[0]?.url) return data.data[0].url;
        if (data.data && data.data.link) return data.data.link;
        if (data.image_url) return data.image_url;
        if (data.images && Array.isArray(data.images) && data.images[0]) return data.images[0];
        if (data.results && Array.isArray(data.results) && data.results[0]?.url) return data.results[0].url;
    } catch (error) {
        console.error('Error fetching gif:', error);
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stare')
        .setDescription('Stare someone down!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to stare at')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't stare at yourself!",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('stare');

        const embed = new EmbedBuilder()
            .setTitle('👀 STARE!')
                .setDescription(`${interaction.user} stares at ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Intense eye contact. 🔥' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'stare.gif' });
                embed.setImage('attachment://stare.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
