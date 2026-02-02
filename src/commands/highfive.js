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
            const response = await axios.get(endpoint, { timeout: 5000 });
            const data = response.data;

            if (data.url) return data.url;
            if (data.gif) return data.gif;
            if (data.image) return data.image;
        } catch (error) {
            continue;
        }
    }
    return null;
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

        const gifUrl = await getPhawseGif('highfive');

        const embed = new EmbedBuilder()
            .setTitle('🙌 HIGH-FIVE!')
            .setDescription(`${interaction.user} high-fives ${user}!\n\n-# *SLAP!* 🎉`)
            .setColor(0x00FF00)
            .setFooter({ text: 'Epic high-five! 🔥' });

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
