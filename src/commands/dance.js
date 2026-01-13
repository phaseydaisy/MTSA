const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPI = 'https://api.phawse.lol/gif/dance';

async function getAnimeGif(action) {
    try {
        const response = await axios.get(phawseAPI, { timeout: 5000 });
        const data = response.data;

        if (data.link) return data.link;
        if (data.url) return data.url;
        if (data.gif) return data.gif;
        
        return null;
    } catch (error) {
        console.error(`Error fetching from phawse API: ${error.message}`);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dance')
        .setDescription('Dance with someone!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to dance with (optional)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user && user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't dance with yourself! Find a partner or just dance solo.",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('dance');

        const embed = new EmbedBuilder()
            .setTitle('💃 DANCE!')
            .setDescription(user ? `${interaction.user} and ${user} are dancing together!` : `${interaction.user} is dancing solo!`)
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
