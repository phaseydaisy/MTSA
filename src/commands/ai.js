const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { joinVoice, leaveVoice } = require('../ai/voiceState');
const { aiConfig } = require('../ai/aiConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI commands (voice controls)')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1])
        .addSubcommand(sub => sub.setName('joinvc').setDescription('Have the AI join your voice channel'))
        .addSubcommand(sub => sub.setName('leavevc').setDescription('Have the AI leave the voice channel')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === 'joinvc') {
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
        } else if (subcommand === 'leavevc') {
            await leaveVoice(interaction.guildId);
            return interaction.editReply({ content: 'Left the voice channel.' });
        } else {
            return interaction.editReply({ content: 'Unknown subcommand.' });
        }
    }
};
