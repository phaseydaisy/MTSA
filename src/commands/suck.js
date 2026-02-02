const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPIEndpoints = [
    'https://api.phawse.lol/nsfw/blowjob',
    'https://api.phawse.lol/nsfw/suck',
    'https://api.phawse.lol/nsfw/oral'
];

async function getAnimeGif(action) {
    for (const endpoint of phawseAPIEndpoints) {
        try {
            const response = await axios.get(endpoint + '?detect', { timeout: 5000 });
            const data = response.data;

            if (data.url || data.gif || data.image) {
                return {
                    url: data.url || data.gif || data.image,
                    anime: data.anime || null
                };
            }
        } catch (error) {
            continue;
        }
    }
    return { url: null, anime: null };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suck')
        .setDescription('Suck someone 🔞 (oral, pleasure)', 'nsfw')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to suck')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ You can't suck yourself!",
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const result = await getAnimeGif('suck');
        const gifUrl = result.url;

        const embed = new EmbedBuilder()
            .setTitle('💋 SUCK!')
            .setDescription(`${interaction.user} sucks ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: result.anime ? `From: ${result.anime} ✨` : 'Slurp slurp. ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'suck.gif' });
                embed.setImage('attachment://suck.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
