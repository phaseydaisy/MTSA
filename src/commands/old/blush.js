const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');
const gifApiEndpoints = [
    'https://api.phawse.lol/gif/blush',
    'https://api.phawse.lol/gif/shy',
    'https://api.phawse.lol/gif/flustered'
];

async function getGifFromApi(category = 'blush') {
    for (const endpoint of gifApiEndpoints) {
        try {
            const response = await axios.get(endpoint, { timeout: 5000 });
            const data = response.data;

            if (data.url || data.gif || data.image) {
                return data.url || data.gif || data.image;
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blush')
        .setDescription('Blush adorably! (shy, embarrassed, flustered)', 'emotions')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        await interaction.deferReply();

        const gifUrl = await getGifFromApi('blush');

        const embed = new EmbedBuilder()
            .setTitle('😊 BLUSH!')
            .setDescription(`${interaction.user} is blushing!`)
            .setColor(0xFF69B4);

        if (gifUrl) {
            try {
                logger.debug(`Downloading GIF: ${gifUrl}`);
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'blush.gif' });
                embed.setImage('attachment://blush.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                logger.error(`Error downloading gif: ${error.message}`);
                embed.setDescription(`${interaction.user} is blushing!`);
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            embed.setDescription(`${interaction.user} is blushing!`);
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
