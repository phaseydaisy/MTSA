const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');
const gifApiEndpoints = [
    'https://api.phawse.lol/gif/bite',
    'https://api.phawse.lol/gif/pinch',
    'https://api.phawse.lol/gif/poke'
];

async function getAnimeGif(action) {
    for (const endpoint of gifApiEndpoints) {
        try {
            logger.debug(`API Request: ${endpoint}`);
            const response = await axios.get(endpoint, { timeout: 5000 });
            const data = response.data;
            logger.info(`API Success: ${endpoint} -> ${response.status}`);

            if (data.url) return data.url;
            if (data.gif) return data.gif;
            if (data.image) return data.image;
        } catch (error) {
            logger.warn(`API Failed: ${endpoint} - ${error.message}`);
            continue;
        }
    }
    logger.error('All API endpoints failed for bite');
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bite')
        .setDescription('Bite someone')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to bite')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('bite');

        const embed = new EmbedBuilder()
            .setTitle('🦷 BITE!')
            .setDescription(`${interaction.user} bites ${user}!`)
            .setColor(0x212121);

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'bite.gif' });
                embed.setImage('attachment://bite.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
