const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const getPhawseGif = require('../utils/getPhawseGif');

const cryTags = ['cry', 'sad', 'upset'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cry')
        .setDescription('Cry alone or at someone 😢')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to cry at (optional)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        await interaction.deferReply();

        const result = await getPhawseGif(cryTags, false, 'cry');
        const gifUrl = result.url;

        const isSelf = !user || user.id === interaction.user.id;
        const description = isSelf 
            ? `${interaction.user} is crying... 😢`
            : `${interaction.user} cries at ${user}! 😭`;

        const embed = new EmbedBuilder()
            .setTitle('😭 Cry')
            .setDescription(description)
            .setColor(0x4682B4)
            .setFooter({ text: result.anime ? `From: ${result.anime} 💙` : 'It\'s okay to cry. 💙' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'cry.gif' });
                embed.setImage('attachment://cry.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
