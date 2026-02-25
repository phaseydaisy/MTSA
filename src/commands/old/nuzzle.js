const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const gifApiEndpoints = [
    'https://api.phawse.lol/gif/nuzzle',
    'https://api.phawse.lol/gif/cuddle',
    'https://api.phawse.lol/gif/snuggle'
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
        .setName('nuzzle')
        .setDescription('Nuzzle someone affectionately! (snuggle, cuddle, affection)', 'closeness')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to nuzzle')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't nuzzle yourself! Find someone else.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif('nuzzle');

        const embed = new EmbedBuilder()
            .setTitle('😊 NUZZLE!')
            .setDescription(`${interaction.user} nuzzles ${user}!`)
            .setColor(0x212121);

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'nuzzle.gif' });
                embed.setImage('attachment://nuzzle.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
