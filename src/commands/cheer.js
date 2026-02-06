const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPIEndpoints = [
    'https://api.phawse.lol/gif/cheer',
    'https://api.phawse.lol/gif/happy',
    'https://api.phawse.lol/gif/celebrate'
];

async function getAnimeGif(action) {
    for (const endpoint of phawseAPIEndpoints) {
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
        .setName('cheer')
        .setDescription('Cheer someone on! (celebrate, clap, hype, support)', 'social')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to cheer (optional)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('happy');

        const embed = new EmbedBuilder()
            .setTitle('✨ CHEER!')
            .setDescription(user.id === interaction.user.id ? `${interaction.user} sends some encouragement!` : `${interaction.user} sends some encouragement to ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Stay positive! 💖' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'cheer.gif' });
                embed.setImage('attachment://cheer.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
