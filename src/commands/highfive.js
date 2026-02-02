const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPIEndpoints = [
    'https://api.phawse.lol/gif/highfive',
    'https://api.phawse.lol/gif/celebrate',
    'https://api.phawse.lol/gif/happy'
];

async function getPhawseGif(category = 'highfive') {
    for (const endpoint of phawseAPIEndpoints) {
        try {
            const response = await axios.get(endpoint + '?detect', { timeout: 5000 });
            const data = response.data;

            if (data.url || data.gif || data.image) {
                return {
                    url: data.url || data.gif || data.image,
                    anime: data.anime || null
                };
            }
        } catch (error) {
            continue;
        }
    }
    return { url: null, anime: null };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('highfive')
        .setDescription('Give someone a high-five! (celebrate, victory)', 'celebration')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to high-five')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't high-five yourself!", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const result = await getPhawseGif('highfive');
        const gifUrl = result.url;

        const embed = new EmbedBuilder()
            .setTitle('🙌 HIGH-FIVE!')
            .setDescription(`${interaction.user} high-fives ${user}!\n\n-# *SLAP!* 🎉`)
            .setColor(0x00FF00)
            .setFooter({ text: result.anime ? `From: ${result.anime} 🔥` : 'Epic high-five! 🔥' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'highfive.gif' });
                embed.setImage('attachment://highfive.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
