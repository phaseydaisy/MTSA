const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const phawseAPIEndpoints = [
    'https://api.phawse.lol/gif/pat',
    'https://api.phawse.lol/gif/hug',
    'https://api.phawse.lol/gif/cuddle'
];

async function getAnimeGif(action) {
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
        .setName('pet')
        .setDescription('Pet someone gently! (pat, stroke, caress)', 'touch')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to pet')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't pet yourself! Pick someone else.",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        let gifUrl = await getAnimeGif('pat');
        if (!gifUrl) gifUrl = await getAnimeGif('hug');

        const embed = new EmbedBuilder()
            .setTitle('🐾 PET!')
            .setDescription(`${interaction.user} pets ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Gentle pets! ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'pet.gif' });
                embed.setImage('attachment://pet.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
