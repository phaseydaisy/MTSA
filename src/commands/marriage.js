const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const marriageFile = path.join(__dirname, '..', 'jsons', 'marriages.json');

function loadMarriages() {
    try {
        if (fs.existsSync(marriageFile)) {
            return JSON.parse(fs.readFileSync(marriageFile, 'utf8'));
        }
    } catch (error) {}
    return {};
}

function saveMarriages(marriages) {
    try {
        const dir = path.dirname(marriageFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(marriageFile, JSON.stringify(marriages, null, 2), 'utf8');
    } catch (error) {}
}

function getSpouses(userId) {
    const marriages = loadMarriages();
    const userStr = userId.toString();
    return marriages[userStr] || [];
}

function removeMarriage(userId, targetId) {
    const marriages = loadMarriages();
    const userStr = userId.toString();
    const targetStr = targetId.toString();
    
    if (marriages[userStr]) {
        marriages[userStr] = marriages[userStr].filter(id => id !== targetStr);
        if (marriages[userStr].length === 0) {
            delete marriages[userStr];
        }
    }
    
    if (marriages[targetStr]) {
        marriages[targetStr] = marriages[targetStr].filter(id => id !== userStr);
        if (marriages[targetStr].length === 0) {
            delete marriages[targetStr];
        }
    }
    
    saveMarriages(marriages);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marriage')
        .setDescription('Manage your marriages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all your marriages')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Check someone else\'s marriages (optional)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('divorce')
                .setDescription('Divorce someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user you want to divorce')
                        .setRequired(true)
                )
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const spouses = getSpouses(targetUser.id);

            const embed = new EmbedBuilder()
                .setTitle(`💍 ${targetUser.username}'s Marriages`)
                .setColor(0xFF69B4)
                .setFooter({ text: `Total marriages: ${spouses.length}` });

            if (spouses.length === 0) {
                embed.setDescription(`${targetUser} is not married to anyone.`);
            } else {
                const spouseList = spouses.map(id => `<@${id}>`).join('\n');
                embed.setDescription(`**Married to:**\n${spouseList}`);
            }

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'divorce') {
            const targetUser = interaction.options.getUser('user');
            const spouses = getSpouses(interaction.user.id);

            if (!spouses.includes(targetUser.id.toString())) {
                return interaction.reply({ 
                    content: `❌ You are not married to ${targetUser}!`, 
                    ephemeral: true 
                });
            }

            removeMarriage(interaction.user.id, targetUser.id);

            const embed = new EmbedBuilder()
                .setTitle('💔 Divorce')
                .setDescription(`${interaction.user} and ${targetUser} are now divorced.`)
                .setColor(0x808080)
                .setFooter({ text: 'Sometimes things don\'t work out. 💔' });

            await interaction.reply({ embeds: [embed] });
        }
    }
};
