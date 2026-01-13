const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const getPhawseGif = require('../utils/getPhawseGif');

const greetTags = ['wave', 'hi', 'hello'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greet')
        .setDescription('Greet someone with a wave! 👋')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to greet')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't greet yourself! Choose someone else.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getPhawseGif(greetTags, false, 'greet');

        const embed = new EmbedBuilder()
            .setTitle('👋 Greet!')
            .setDescription(`${interaction.user} greets ${user}! Hello! 👋`)
            .setColor(0xFFD700)
            .setFooter({ text: 'Nice to meet you! ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'greet.gif' });
                embed.setImage('attachment://greet.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
