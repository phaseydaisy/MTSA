const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const gifApiEndpoints = [
    'https://api.phawse.lol/gif/tickle',
    'https://api.phawse.lol/gif/laugh',
    'https://api.phawse.lol/gif/happy'
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
    console.error('All API endpoints failed for tickle');
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickle')
        .setDescription('Tickle someone! (tease, giggle, laugh)', 'playful')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to tickle')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't tickle yourself!",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('tickle');

        const embed = new EmbedBuilder()
            .setTitle('😂 TICKLE!')
            .setDescription(`${interaction.user} tickles ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Giggles incoming! ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'tickle.gif' });
                embed.setImage('attachment://tickle.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
