const { SlashCommandBuilder } = require('discord.js');
const { leaveVoice } = require('../ai/voiceState');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aileavevc')
        .setDescription('Have the AI leave the voice channel')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        await leaveVoice(interaction.guildId);
        return interaction.reply({ content: 'Left the voice channel.', ephemeral: true });
    }
};
