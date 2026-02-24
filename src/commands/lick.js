const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const gifApiEndpoints = [
    'https://api.phawse.lol/gif/lick',
    'https://api.phawse.lol/gif/kiss',
    'https://api.phawse.lol/gif/blush'
];

async function getGifFromApi(category = 'lick') {
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
        .setName('lick')
        .setDescription('Lick someone! (playful, teasing)', 'playful')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to lick')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't lick yourself!", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getGifFromApi('lick');

        const embed = new EmbedBuilder()
            .setTitle('👅 LICK!')
            .setDescription(`${interaction.user} licks ${user}!\n\n-# *slurp* 😜`)
            .setColor(0xFF69B4)
            .setFooter({ text: 'Got licked! 😳' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'lick.gif' });
                embed.setImage('attachment://lick.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
