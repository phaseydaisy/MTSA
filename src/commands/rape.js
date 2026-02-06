const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const responses = [
    'violently rapes',
    'aggressively rapes',
    'brutally rapes',
    'forcefully rapes',
    'savagely rapes'
];

const phawseAPIEndpoints = [
    'https://api.phawse.lol/nsfw/sex'
];

async function getAnimeGif() {
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
        .setName('rape')
        .setDescription('Playfully attack someone! (aggressive roleplay)', 'aggressive')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to rape')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't target yourself! Choose someone else.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getAnimeGif();

        const actionText = responses[Math.floor(Math.random() * responses.length)];

        const embed = new EmbedBuilder()
            .setTitle('💢 RAPE!')
            .setDescription(`${interaction.user} ${actionText} ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Powered by Phawse API ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'rape.gif' });
                embed.setImage('attachment://rape.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
