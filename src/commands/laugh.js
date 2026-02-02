const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const getPhawseGif = require('../utils/getPhawseGif');

const laughTags = ['laugh', 'happy', 'smile'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('laugh')
        .setDescription('Laugh alone or at someone 😂')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to laugh at (optional)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        await interaction.deferReply();

        const result = await getPhawseGif(laughTags, false, 'laugh');
        const gifUrl = result.url;

        const isSelf = !user || user.id === interaction.user.id;
        const description = isSelf 
            ? `${interaction.user} is laughing! 😂`
            : `${interaction.user} laughs at ${user}! 🤣`;

        const embed = new EmbedBuilder()
            .setTitle('😂 Laugh')
            .setDescription(description)
            .setColor(0xFFD700)
            .setFooter({ text: result.anime ? `From: ${result.anime} 😄` : 'Laughter is contagious! 😄' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'laugh.gif' });
                embed.setImage('attachment://laugh.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
