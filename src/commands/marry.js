const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

function isMarried(userId, targetId) {
    const marriages = loadMarriages();
    const userStr = userId.toString();
    const targetStr = targetId.toString();
    
    if (!marriages[userStr]) return false;
    return marriages[userStr].includes(targetStr);
}

function addMarriage(userId, targetId) {
    const marriages = loadMarriages();
    const userStr = userId.toString();
    const targetStr = targetId.toString();
    
    if (!marriages[userStr]) {
        marriages[userStr] = [];
    }
    if (!marriages[targetStr]) {
        marriages[targetStr] = [];
    }
    
    if (!marriages[userStr].includes(targetStr)) {
        marriages[userStr].push(targetStr);
    }
    if (!marriages[targetStr].includes(userStr)) {
        marriages[targetStr].push(userStr);
    }
    
    saveMarriages(marriages);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Propose marriage to someone! 💍')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to marry')
                .setRequired(true)
        )
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (user.id === interaction.user.id) {
            return interaction.reply({ 
                content: "❌ You can't marry yourself! Choose someone else.", 
                ephemeral: true 
            });
        }

        if (user.bot) {
            return interaction.reply({ 
                content: "❌ You can't marry a bot!", 
                ephemeral: true 
            });
        }

        if (isMarried(interaction.user.id, user.id)) {
            return interaction.reply({ 
                content: `❌ You are already married to ${user}!`, 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('💍 Marriage Proposal')
            .setDescription(`${interaction.user} wants to marry ${user}!\n\n${user}, do you accept this proposal?`)
            .setColor(0xFF69B4)
            .setFooter({ text: 'Proposal expires in 60 seconds ⏰' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`marry_accept_${interaction.user.id}_${user.id}`)
                    .setLabel('Accept 💕')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`marry_decline_${interaction.user.id}_${user.id}`)
                    .setLabel('Decline 💔')
                    .setStyle(ButtonStyle.Danger)
            );

        const response = await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            fetchReply: true 
        });

        const collector = response.createMessageComponentCollector({ 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) {
                return i.reply({ 
                    content: '❌ Only the person being proposed to can respond!', 
                    ephemeral: true 
                });
            }

            if (i.customId.startsWith('marry_accept')) {
                addMarriage(interaction.user.id, user.id);

                const acceptEmbed = new EmbedBuilder()
                    .setTitle('💕 Marriage Accepted!')
                    .setDescription(`Congratulations! ${interaction.user} and ${user} are now married! 🎉💍`)
                    .setColor(0x00FF00)
                    .setFooter({ text: 'May your love last forever! 💖' });

                await i.update({ 
                    embeds: [acceptEmbed], 
                    components: [] 
                });
            } else if (i.customId.startsWith('marry_decline')) {
                const declineEmbed = new EmbedBuilder()
                    .setTitle('💔 Marriage Declined')
                    .setDescription(`${user} has declined ${interaction.user}'s marriage proposal.`)
                    .setColor(0xFF0000)
                    .setFooter({ text: 'Better luck next time! 💔' });

                await i.update({ 
                    embeds: [declineEmbed], 
                    components: [] 
                });
            }

            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Proposal Expired')
                    .setDescription(`${user} didn't respond in time. The marriage proposal has expired.`)
                    .setColor(0x808080)
                    .setFooter({ text: 'Try again later!' });

                interaction.editReply({ 
                    embeds: [timeoutEmbed], 
                    components: [] 
                }).catch(() => {});
            }
        });
    }
};
