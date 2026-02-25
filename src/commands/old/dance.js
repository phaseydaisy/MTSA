const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');

const gifApiEndpoints = [
    'https://api.phawse.lol/gif/dance',
    'https://api.phawse.lol/gif/spin',
    'https://api.phawse.lol/gif/happy'
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
    logger.error('All API endpoints failed for dance');
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dance')
        .setDescription('Dance with someone! (groove, move, jive)', 'actions')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to dance with (optional)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user && user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't dance with yourself! Find a partner or just dance solo.",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('dance');

        const embed = new EmbedBuilder()
            .setTitle('💃 DANCE!')
            .setDescription(user ? `${interaction.user} and ${user} are dancing together!` : `${interaction.user} is dancing solo!`)
            .setColor(0x212121);

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'dance.gif' });
                embed.setImage('attachment://dance.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
