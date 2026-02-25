const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const getGifFromApi = require('../utils/getGifFromApi');

// Only use tags relevant to the command (no generic hentai, etc.)
const edgeTags = ['masturbate', 'ecchi', 'tease'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edge')
        .setDescription('Edge someone or yourself')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to edge (optional - defaults to yourself)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply();

        const gifUrl = await getGifFromApi(edgeTags, true, 'edge'); // true = nsfw endpoint

        const isSelf = user.id === interaction.user.id;
        const description = isSelf 
            ? `${interaction.user} edges themselves!`
            : `${interaction.user} edges ${user}!`;

        const embed = new EmbedBuilder()
            .setTitle('🪢 EDGE!')
            .setDescription(description)
            .setColor(0x212121);

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'edge.gif' });
                embed.setImage('attachment://edge.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
