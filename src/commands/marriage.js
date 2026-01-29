const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { resolveDataFile } = require('../utils/dataDir');

const marriageFile = resolveDataFile('marriages.json');

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
    const spouseData = marriages[userStr] || [];
    
    // Handle old format (array of IDs) and new format (array of objects)
    if (spouseData.length > 0 && typeof spouseData[0] === 'string') {
        // Convert old format to new format
        return spouseData.map(id => ({ spouseId: id, date: Date.now() }));
    }
    return spouseData;
}

function formatDuration(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        return 'less than an hour';
    }
}

function removeMarriage(userId, targetId) {
    const marriages = loadMarriages();
    const userStr = userId.toString();
    const targetStr = targetId.toString();
    
    if (marriages[userStr]) {
        marriages[userStr] = marriages[userStr].filter(m => 
            (typeof m === 'string' ? m : m.spouseId) !== targetStr
        );
        if (marriages[userStr].length === 0) {
            delete marriages[userStr];
        }
    }
    
    if (marriages[targetStr]) {
        marriages[targetStr] = marriages[targetStr].filter(m => 
            (typeof m === 'string' ? m : m.spouseId) !== userStr
        );
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
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const spouses = getSpouses(interaction.user.id);
        
        // Get spouse user objects
        const choices = [];
        for (const spouse of spouses) {
            const spouseId = typeof spouse === 'string' ? spouse : spouse.spouseId;
            try {
                const user = await interaction.client.users.fetch(spouseId);
                if (user && user.username.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: user.username, value: spouseId });
                }
            } catch (error) {
                // Skip if user can't be fetched
            }
        }
        
        await interaction.respond(choices.slice(0, 25));
    },

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
                const spouseList = [];
                for (const spouse of spouses) {
                    const spouseId = typeof spouse === 'string' ? spouse : spouse.spouseId;
                    const marriageDate = typeof spouse === 'object' ? spouse.date : Date.now();
                    const timestampSeconds = Math.floor(marriageDate / 1000);
                    spouseList.push(`<@${spouseId}> • Married <t:${timestampSeconds}:R>`);
                }
                embed.setDescription(`**Married to:**\n${spouseList.join('\n')}`);
            }

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'divorce') {
            const targetUser = interaction.options.getUser('user');
            const spouses = getSpouses(interaction.user.id);
            const isMarriedTo = spouses.some(s => 
                (typeof s === 'string' ? s : s.spouseId) === targetUser.id.toString()
            );

            if (!isMarriedTo) {
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
