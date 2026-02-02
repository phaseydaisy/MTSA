const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPIEndpoints = [
    'https://api.phawse.lol/gif/handhold',
    'https://api.phawse.lol/gif/hug',
    'https://api.phawse.lol/gif/cuddle'
];

async function getPhawseGif(category = 'handhold') {
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
        .setName('handhold')
        .setDescription('Hold hands with someone! (romantic, intimate)', 'romance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to hold hands with')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't hold your own hand!", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getPhawseGif('handhold');

        const embed = new EmbedBuilder()
            .setTitle('🤝 HANDHOLD!')
            .setDescription(`${interaction.user} holds hands with ${user}!\n\n-# *so romantic* 💕`)
            .setColor(0xFF1493)
            .setFooter({ text: 'Hand in hand~ 💫' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'handhold.gif' });
                embed.setImage('attachment://handhold.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
