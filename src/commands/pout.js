const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPIEndpoints = [
    'https://api.phawse.lol/gif/pout',
    'https://api.phawse.lol/gif/sad',
    'https://api.phawse.lol/gif/cry'
];

async function getPhawseGif(category = 'pout') {
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
        .setName('pout')
        .setDescription('Pout cutely! (sulk, adorable)', 'cute')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        await interaction.deferReply();

        const gifUrl = await getPhawseGif('pout');

        const embed = new EmbedBuilder()
            .setTitle('😠 POUT!')
            .setDescription(`${interaction.user} is pouting adorably!\n\n-# *pouty face* 🥺`)
            .setColor(0xFF6B9D)
            .setFooter({ text: 'So adorable when pouting~ 💕' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'pout.gif' });
                embed.setImage('attachment://pout.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
