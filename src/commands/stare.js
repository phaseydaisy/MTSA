const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const phawseAPI = 'https://api.phawse.lol/gif/glare';



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
