const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { joinVoice } = require('../ai/voiceState');
const { aiConfig } = require('../ai/aiConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aijoinvc')
        .setDescription('Have the AI join your voice channel')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!aiConfig.voice || !aiConfig.voice.enabled) {
            return interaction.editReply({ content: 'Voice mode is disabled.' });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const voiceChannel = member.voice ? member.voice.channel : null;

        if (!voiceChannel) {
            return interaction.editReply({ content: 'Join a voice channel first.' });
        }

        await joinVoice({
            voiceChannel,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId
        });
        return interaction.editReply({ content: `Joined ${voiceChannel.name}.` });
    }
};
