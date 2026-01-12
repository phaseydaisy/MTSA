const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'jsons', 'rape_stats.json');

function loadStats() {
    try {
        if (fs.existsSync(statsFile)) {
            return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        }
    } catch (error) {}
    return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rapestats')
        .setDescription('View rape statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check stats for (defaults to you)')
                .setRequired(false)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const targetStr = user.id.toString();
        const stats = loadStats();

        const embed = new EmbedBuilder()
            .setTitle('📊 Rape Statistics')
            .setDescription(`Who has raped ${user}`)
            .setColor(0x212121);

        if (stats[targetStr] && Object.keys(stats[targetStr]).length > 0) {
            const rapeData = stats[targetStr];
            const sorted = Object.entries(rapeData).sort((a, b) => b[1] - a[1]);

            for (const [rapistId, count] of sorted) {
                try {
                    const rapist = await interaction.client.users.fetch(rapistId);
                    embed.addFields({ name: rapist.tag, value: `\`${count}\` times`, inline: false });
                } catch (error) {
                    embed.addFields({ name: `User ${rapistId}`, value: `\`${count}\` times`, inline: false });
                }
            }
        } else {
            embed.setDescription(`${user} has never been raped 😳`);
        }

        if (user.avatarURL()) {
            embed.setThumbnail(user.avatarURL());
        }

        await interaction.reply({ embeds: [embed] });
    }
};
