const { SlashCommandBuilder } = require('discord.js');
const { joinVoice } = require('../ai/voiceState');
const { aiConfig } = require('../ai/aiConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aijoinvc')
        .setDescription('Have the AI join your voice channel')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        if (!aiConfig.voice || !aiConfig.voice.enabled) {
            return interaction.reply({ content: 'Voice mode is disabled.', ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const voiceChannel = member.voice ? member.voice.channel : null;

        if (!voiceChannel) {
            return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
        }

        await joinVoice({
            voiceChannel,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId
        });
        return interaction.reply({ content: `Joined ${voiceChannel.name}.`, ephemeral: true });
    }
};
