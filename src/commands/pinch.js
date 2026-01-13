const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPI = 'https://api.phawse.lol/gif/pinch';

async function getPhawseGif(category = 'pinch') {
    try {
        const response = await axios.get(`https://api.phawse.lol/gif/${category}`, { timeout: 5000 });
        const data = response.data;

        if (data.url) return data.url;
        if (data.gif) return data.gif;
        if (data.image) return data.image;
        
        return null;
    } catch (error) {
        console.error(`Error fetching from phawse API: ${error.message}`);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pinch')
        .setDescription('Pinch someone! (tweak, squeeze)', 'playful')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to pinch')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't pinch yourself!", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getPhawseGif('pinch');

        const embed = new EmbedBuilder()
            .setTitle('🤏 PINCH!')
            .setDescription(`${interaction.user} pinches ${user}!\n\n-# *ouch!* 😣`)
            .setColor(0xFF69B4)
            .setFooter({ text: 'Got pinched! 😫' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'pinch.gif' });
                embed.setImage('attachment://pinch.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
