const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPI = 'https://api.phawse.lol/gif/wink';

async function getPhawseGif(category = 'wink') {
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
        .setName('wink')
        .setDescription('Wink at someone! (flirt, tease)', 'flirt')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to wink at')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user && user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't wink at yourself!", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getPhawseGif('wink');

        const embed = new EmbedBuilder()
            .setTitle('😉 WINK!')
            .setDescription(user
                ? `${interaction.user} winks at ${user}!\n\n-# *flirty wink* 😎`
                : `${interaction.user} throws a playful wink!\n\n-# *flirty wink* 😎`)
            .setColor(0xFFD700)
            .setFooter({ text: 'Got winked at! 👀' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'wink.gif' });
                embed.setImage('attachment://wink.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
