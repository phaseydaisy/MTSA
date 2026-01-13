const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPI = 'https://api.phawse.lol/gif/smirk';

async function getPhawseGif(category = 'smirk') {
    try {
        const response = await axios.get(`https://api.phawse.lol/gif/${category}`, { timeout: 5000 });
        const data = response.data;

        if (data.url) return data.url;
        if (data.gif) return data.gif;
        if (data.image) return data.image;
        
        return null;
    } catch (error) {
        console.error(`Error fetching from phawse API: ${error.message}`);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('smirk')
        .setDescription('Smirk at someone! (cocky, confident, sly)', 'confident')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to smirk at (optional)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        await interaction.deferReply();

        const gifUrl = await getPhawseGif('smirk');

        let description;
        if (user) {
            description = `${interaction.user} smirks at ${user}!\n\n-# *so cocky* 😏`;
        } else {
            description = `${interaction.user} smirks confidently!\n\n-# *looking sharp* 😏`;
        }

        const embed = new EmbedBuilder()
            .setTitle('😏 SMIRK!')
            .setDescription(description)
            .setColor(0x1E90FF)
            .setFooter({ text: 'Got smirked at! 👀' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'smirk.gif' });
                embed.setImage('attachment://smirk.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
