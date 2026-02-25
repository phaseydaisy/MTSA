const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { leaveVoice } = require('../ai/voiceState');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aileavevc')
        .setDescription('Have the AI leave the voice channel')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        await leaveVoice(interaction.guildId);
        return interaction.editReply({ content: 'Left the voice channel.' });
    }
};
