const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

const SUGGESTION_CHANNEL_ID = '1488323127518957709';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Send a suggestion to the server suggestion channel')
        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('The title of your suggestion')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('suggestions')
                .setDescription('The suggestion details or ideas')
                .setRequired(true))
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const title = interaction.options.getString('title');
        const suggestions = interaction.options.getString('suggestions');

        await interaction.deferReply({ ephemeral: true });

        let targetChannel = interaction.client.channels.cache.get(SUGGESTION_CHANNEL_ID);
        if (!targetChannel) {
            try {
                targetChannel = await interaction.client.channels.fetch(SUGGESTION_CHANNEL_ID);
            } catch (error) {
                logger.error(`Failed to fetch suggestion channel: ${error.message}`);
            }
        }

        if (!targetChannel || !targetChannel.isTextBased()) {
            logger.error(`Suggestion channel ${SUGGESTION_CHANNEL_ID} not found or not text-based.`);
            return interaction.editReply({ content: '❌ Could not deliver your suggestion right now. Please try again later.' });
        }

        const embed = new EmbedBuilder()
            .setTitle(`Suggestion: ${title}`)
            .setDescription(suggestions)
            .setColor(0x00AE86)
            .setFooter({ text: `Submitted by ${interaction.user.tag}` })
            .setTimestamp();

        try {
            await targetChannel.send({
                content: `<@${interaction.user.id}>`,
                allowedMentions: { users: [interaction.user.id] },
                embeds: [embed]
            });

            return interaction.editReply({ content: '✅ Your suggestion has been sent successfully!' });
        } catch (error) {
            logger.error(`Failed to send suggestion message: ${error.message}`);
            return interaction.editReply({ content: '❌ Failed to send your suggestion. Please make sure the bot has access to the target channel.' });
        }
    }
};
