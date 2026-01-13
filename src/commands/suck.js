const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const phawseAPI = 'https://api.phawse.lol/nsfw/blowjob';

async function getAnimeGif(action) {
    try {
        const response = await axios.get(phawseAPI, { timeout: 5000 });
        const data = response.data;

            // purrbot format
            if (data.link) return data.link;
            
            // waifu.pics format
            if (data.url) return data.url;
            
            // nekos.best format
            if (data.results && Array.isArray(data.results) && data.results[0]?.url) {
                return data.results[0].url;
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suck')
        .setDescription('Suck someone')
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

        const gifUrl = await getAnimeGif('suck');

        const embed = new EmbedBuilder()
            .setTitle('💋 SUCK!')
            .setDescription(`${interaction.user} sucks ${user}!`)
            .setColor(0x212121)
            .setFooter({ text: 'Slurp slurp. ✨' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer' });
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
