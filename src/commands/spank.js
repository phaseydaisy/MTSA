const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const gifApiEndpoints = [
    'https://api.phawse.lol/nsfw/bondage',
    'https://api.phawse.lol/nsfw/sex',
    'https://api.phawse.lol/nsfw/oppai'
];

async function getAnimeGif(action) {
    for (const endpoint of gifApiEndpoints) {
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
        .setName('spank')
        .setDescription('SPANK THEM')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to spank')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't spank yourself! Choose someone else.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('spank');

        const embed = new EmbedBuilder()
            .setTitle('👋 SPANK!')
            .setDescription(`${interaction.user} spanks ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Powered by PurrBot API ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'spank.gif' });
                embed.setImage('attachment://spank.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
