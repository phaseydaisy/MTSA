const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const logger = require('../utils/logger');
const getGifFromApi = require('../utils/getGifFromApi');

async function fetchImage(type, commandKey) {
    const imageUrl = await getGifFromApi([type], false, commandKey);
    if (!imageUrl) {
        throw new Error(`No image URL returned for ${type}`);
    }
    return imageUrl;
}

function buildNekoEmbed(imageUrl, index, total, user) {
    return new EmbedBuilder()
        .setTitle('🐱 Neko')
        .setDescription(`Here you go, ${user}.`)
        .setImage(imageUrl)
        .setColor(0x212121)
        .setFooter({ text: `Image ${index + 1}/${total}` });
}

function buildNekoButtons(commandId, index) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`neko_back_${commandId}`)
            .setLabel('◀ Back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === 0),
        new ButtonBuilder()
            .setCustomId(`neko_next_${commandId}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
    );
}

function buildWaifuEmbed(imageUrl, index, total, user) {
    return new EmbedBuilder()
        .setTitle('💗 Waifu')
        .setDescription(`Here you go, ${user}.`)
        .setImage(imageUrl)
        .setColor(0x212121)
        .setFooter({ text: `Image ${index + 1}/${total}` });
}

function buildWaifuButtons(commandId, index) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`waifu_back_${commandId}`)
            .setLabel('◀ Back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === 0),
        new ButtonBuilder()
            .setCustomId(`waifu_next_${commandId}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
    );
}

const nekoCommand = {
    data: new SlashCommandBuilder()
        .setName('neko')
        .setDescription('Send a neko image with browse buttons')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        let images = [];
        let index = 0;

        try {
            const firstImage = await fetchImage('neko', 'image:neko');
            images.push(firstImage);

            const commandId = interaction.id;
            const embed = buildNekoEmbed(images[index], index, images.length, interaction.user);
            const components = [buildNekoButtons(commandId, index)];

            const replyMessage = await interaction.editReply({
                embeds: [embed],
                components,
                fetchReply: true
            });

            const filter = (buttonInteraction) => {
                if (buttonInteraction.user.id === interaction.user.id) {
                    return true;
                }

                buttonInteraction.reply({
                    content: 'Only the command user can use these buttons.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => null);
                return false;
            };

            const collector = replyMessage.createMessageComponentCollector({
                filter,
                time: 120000
            });

            collector.on('collect', async (buttonInteraction) => {
                try {
                    if (buttonInteraction.customId === `neko_back_${commandId}`) {
                        index = Math.max(0, index - 1);
                    }

                    if (buttonInteraction.customId === `neko_next_${commandId}`) {
                        if (index === images.length - 1) {
                            const nextImage = await fetchImage('neko', 'image:neko');
                            images.push(nextImage);
                        }
                        index += 1;
                    }

                    const updatedEmbed = buildNekoEmbed(images[index], index, images.length, interaction.user);
                    const updatedComponents = [buildNekoButtons(commandId, index)];

                    await buttonInteraction.update({
                        embeds: [updatedEmbed],
                        components: updatedComponents
                    });
                } catch (error) {
                    logger.error(`Neko button interaction failed: ${error.message}`);
                    await buttonInteraction.deferUpdate().catch(() => null);
                }
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`neko_back_${commandId}_disabled`)
                        .setLabel('◀ Back')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`neko_next_${commandId}_disabled`)
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                await interaction.editReply({ components: [disabledRow] }).catch(() => null);
            });
        } catch (error) {
            logger.error(`Neko command failed: ${error.message}`);
            await interaction.editReply({
                content: '❌ Failed to fetch neko image right now. Try again in a moment.',
                embeds: [],
                components: []
            });
        }
    }
};

const waifuCommand = {
    data: new SlashCommandBuilder()
        .setName('waifu')
        .setDescription('Send a waifu image')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        let images = [];
        let index = 0;

        try {
            const firstImage = await fetchImage('waifu', 'image:waifu');
            images.push(firstImage);

            const commandId = interaction.id;
            const embed = buildWaifuEmbed(images[index], index, images.length, interaction.user);
            const components = [buildWaifuButtons(commandId, index)];

            const replyMessage = await interaction.editReply({
                embeds: [embed],
                components,
                fetchReply: true
            });

            const filter = (buttonInteraction) => {
                if (buttonInteraction.user.id === interaction.user.id) {
                    return true;
                }

                buttonInteraction.reply({
                    content: 'Only the command user can use these buttons.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => null);
                return false;
            };

            const collector = replyMessage.createMessageComponentCollector({
                filter,
                time: 120000
            });

            collector.on('collect', async (buttonInteraction) => {
                try {
                    if (buttonInteraction.customId === `waifu_back_${commandId}`) {
                        index = Math.max(0, index - 1);
                    }

                    if (buttonInteraction.customId === `waifu_next_${commandId}`) {
                        if (index === images.length - 1) {
                            const nextImage = await fetchImage('waifu', 'image:waifu');
                            images.push(nextImage);
                        }
                        index += 1;
                    }

                    const updatedEmbed = buildWaifuEmbed(images[index], index, images.length, interaction.user);
                    const updatedComponents = [buildWaifuButtons(commandId, index)];

                    await buttonInteraction.update({
                        embeds: [updatedEmbed],
                        components: updatedComponents
                    });
                } catch (error) {
                    logger.error(`Waifu button interaction failed: ${error.message}`);
                    await buttonInteraction.deferUpdate().catch(() => null);
                }
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`waifu_back_${commandId}_disabled`)
                        .setLabel('◀ Back')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`waifu_next_${commandId}_disabled`)
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                await interaction.editReply({ components: [disabledRow] }).catch(() => null);
            });
        } catch (error) {
            logger.error(`Waifu command failed: ${error.message}`);
            await interaction.editReply({
                content: '❌ Failed to fetch waifu image right now. Try again in a moment.',
                embeds: [],
                components: []
            });
        }
    }
};

module.exports = [nekoCommand, waifuCommand];
