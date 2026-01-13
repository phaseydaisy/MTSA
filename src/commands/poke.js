const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const phawseAPI = 'https://api.phawse.lol/gif/poke';

async function getPhawseGif(category = 'poke') {
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
        .setName('poke')
        .setDescription('Poke someone! (prod, jab, annoy)', 'playful')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to poke')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't poke yourself!", 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const gifUrl = await getPhawseGif('poke');

        const embed = new EmbedBuilder()
            .setTitle('👉 POKE!')
            .setDescription(`${interaction.user} pokes ${user}!\n\n-# *poke poke* 😝`)
            .setColor(0xFFA500)
            .setFooter({ text: 'Got poked! 🙃' });

        if (gifUrl) {
            try {
                const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: 'poke.gif' });
                embed.setImage('attachment://poke.gif');
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
