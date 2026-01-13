const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPI = 'https://api.phawse.lol/gif/boop';

async function getPhawseGif(category = 'boop') {
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
        .setName('boop')
        .setDescription('Boop someone on the nose! (cute, playful tap)', 'cute')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to boop')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't boop yourself! That's silly.", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getPhawseGif('boop');

        const embed = new EmbedBuilder()
            .setTitle('👃 BOOP!')
            .setDescription(`${interaction.user} boops ${user} on the nose!\n\n-# *boop* 💫`)
            .setColor(0xFFB6C1)
            .setFooter({ text: 'Got booped! 😄' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'boop.gif' });
                embed.setImage('attachment://boop.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                embed.setDescription(`${interaction.user} boops ${user} on the nose!\n\n-# *boop* 💫`);
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
