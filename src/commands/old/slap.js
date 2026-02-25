const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');
const gifApiEndpoints = [
    'https://api.phawse.lol/gif/slap',
    'https://api.phawse.lol/gif/angry',
    'https://api.phawse.lol/gif/punch'
];

async function getAnimeGif(action) {
    for (const endpoint of gifApiEndpoints) {
        try {
            logger.debug(`API Request: ${endpoint}`);
            const response = await axios.get(endpoint, { timeout: 5000 });
            const data = response.data;
            logger.info(`API Success: ${endpoint} -> ${response.status}`);

            if (data.url || data.gif || data.image) {
                return data.url || data.gif || data.image;
            }
        } catch (error) {
            logger.warn(`API Failed: ${endpoint} - ${error.message}`);
            continue;
        }
    }
    logger.error('All API endpoints failed for slap');
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Slap someone! (hit, punch, strike)', 'playful aggression')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to slap')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't slap yourself! That's weird.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('slap');

        const embed = new EmbedBuilder()
            .setTitle('✋ SLAP!')
            .setDescription(`${interaction.user} slaps ${user}!`)
            .setColor(0x212121);

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'slap.gif' });
                embed.setImage('attachment://slap.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
