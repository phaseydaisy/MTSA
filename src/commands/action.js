const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');
const getGifFromApi = require('../utils/getGifFromApi');

const actionConfigs = {
    hug: {
        title: '🤗 HUG!',
        endpoints: ['https://api.phawse.lol/gif/hug', 'https://api.phawse.lol/gif/cuddle', 'https://api.phawse.lol/gif/snuggle'],
        actionText: (user, target) => `${user} hugs ${target}!`,
        selfError: "You can't hug yourself! Find someone else to hug."
    },
    kiss: {
        title: '💋 KISS!',
        endpoints: ['https://api.phawse.lol/gif/kiss', 'https://api.phawse.lol/gif/blush', 'https://api.phawse.lol/gif/love'],
        actionText: (user, target) => `${user} kisses ${target}!`,
        selfError: "You can't kiss yourself! Find someone else."
    },
    slap: {
        title: '✋ SLAP!',
        endpoints: ['https://api.phawse.lol/gif/slap', 'https://api.phawse.lol/gif/angry', 'https://api.phawse.lol/gif/punch'],
        actionText: (user, target) => `${user} slaps ${target}!`,
        selfError: "You can't slap yourself! That's weird."
    },
    bite: {
        title: '🦷 BITE!',
        endpoints: ['https://api.phawse.lol/gif/bite', 'https://api.phawse.lol/gif/pinch', 'https://api.phawse.lol/gif/poke'],
        actionText: (user, target) => `${user} bites ${target}!`,
        selfError: "You can't bite yourself!"
    },
    nuzzle: {
        title: '😊 NUZZLE!',
        endpoints: ['https://api.phawse.lol/gif/nuzzle', 'https://api.phawse.lol/gif/cuddle', 'https://api.phawse.lol/gif/snuggle'],
        actionText: (user, target) => `${user} nuzzles ${target}!`,
        selfError: "You can't nuzzle yourself! Find someone else."
    },
    pet: {
        title: '🐾 PET!',
        endpoints: ['https://api.phawse.lol/gif/pat', 'https://api.phawse.lol/gif/hug', 'https://api.phawse.lol/gif/cuddle'],
        actionText: (user, target) => `${user} pets ${target}!`,
        selfError: "You can't pet yourself!"
    },
    lick: {
        title: '👅 LICK!',
        endpoints: ['https://api.phawse.lol/gif/lick', 'https://api.phawse.lol/gif/kiss', 'https://api.phawse.lol/gif/blush'],
        actionText: (user, target) => `${user} licks ${target}!\n\n-# *slurp* 😜`,
        selfError: "You can't lick yourself!"
    },
    tickle: {
        title: '😂 TICKLE!',
        endpoints: ['https://api.phawse.lol/gif/tickle', 'https://api.phawse.lol/gif/laugh', 'https://api.phawse.lol/gif/happy'],
        actionText: (user, target) => `${user} tickles ${target}!`,
        selfError: "You can't tickle yourself!"
    },
    poke: {
        title: '👉 POKE!',
        endpoints: ['https://api.phawse.lol/gif/poke', 'https://api.phawse.lol/gif/pinch', 'https://api.phawse.lol/gif/punch'],
        actionText: (user, target) => `${user} pokes ${target}!\n\n-# *poke poke* 😝`,
        selfError: "You can't poke yourself!"
    },
    pinch: {
        title: '🤏 PINCH!',
        endpoints: ['https://api.phawse.lol/gif/pinch', 'https://api.phawse.lol/gif/poke', 'https://api.phawse.lol/gif/punch'],
        actionText: (user, target) => `${user} pinches ${target}!\n\n-# *ouch!* 😣`,
        selfError: "You can't pinch yourself!"
    },
    boop: {
        title: '👃 BOOP!',
        endpoints: ['https://api.phawse.lol/gif/boop', 'https://api.phawse.lol/gif/poke', 'https://api.phawse.lol/gif/cuddle'],
        actionText: (user, target) => `${user} boops ${target} on the nose!\n\n-# *boop* 💫`,
        selfError: "You can't boop yourself!"
    },
    handhold: {
        title: '🤝 HANDHOLD!',
        endpoints: ['https://api.phawse.lol/gif/handhold', 'https://api.phawse.lol/gif/hug', 'https://api.phawse.lol/gif/cuddle'],
        actionText: (user, target) => `${user} holds hands with ${target}!\n\n-# *so romantic* 💕`,
        selfError: "You can't hold your own hand!"
    },
    highfive: {
        title: '🙌 HIGH-FIVE!',
        endpoints: ['https://api.phawse.lol/gif/highfive', 'https://api.phawse.lol/gif/celebrate', 'https://api.phawse.lol/gif/happy'],
        actionText: (user, target) => `${user} high-fives ${target}!\n\n-# *SLAP!* 🎉`,
        selfError: "You can't high-five yourself!"
    },
    greet: {
        title: '👋 GREET!',
        endpoints: ['https://api.phawse.lol/gif/wave', 'https://api.phawse.lol/gif/hello',],
        actionText: (user, target) => `${user} greets ${target}! Hello! 👋`,
        selfError: "You can't greet yourself!"
    },
    cheer: {
        title: '✨ CHEER!',
        endpoints: ['https://api.phawse.lol/gif/cheer', 'https://api.phawse.lol/gif/happy', 'https://api.phawse.lol/gif/celebrate'],
        actionText: (user, target) => `${user} sends some encouragement to ${target}!`,
        selfError: null
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('action')
        .setDescription('Perform actions with other users')
        .addSubcommand(subcommand =>
            subcommand
                .setName('hug')
                .setDescription('Give someone a warm hug')
                .addUserOption(option => option.setName('user').setDescription('The user to hug').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kiss')
                .setDescription('Give someone a kiss')
                .addUserOption(option => option.setName('user').setDescription('The user to kiss').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slap')
                .setDescription('Slap someone')
                .addUserOption(option => option.setName('user').setDescription('The user to slap').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bite')
                .setDescription('Bite someone')
                .addUserOption(option => option.setName('user').setDescription('The user to bite').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nuzzle')
                .setDescription('Nuzzle someone affectionately')
                .addUserOption(option => option.setName('user').setDescription('The user to nuzzle').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pet')
                .setDescription('Pet someone')
                .addUserOption(option => option.setName('user').setDescription('The user to pet').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lick')
                .setDescription('Lick someone')
                .addUserOption(option => option.setName('user').setDescription('The user to lick').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tickle')
                .setDescription('Tickle someone')
                .addUserOption(option => option.setName('user').setDescription('The user to tickle').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('poke')
                .setDescription('Poke someone')
                .addUserOption(option => option.setName('user').setDescription('The user to poke').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pinch')
                .setDescription('Pinch someone')
                .addUserOption(option => option.setName('user').setDescription('The user to pinch').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('boop')
                .setDescription('Boop someone on the nose')
                .addUserOption(option => option.setName('user').setDescription('The user to boop').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('handhold')
                .setDescription('Hold hands with someone')
                .addUserOption(option => option.setName('user').setDescription('The user to hold hands with').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('highfive')
                .setDescription('Give someone a high-five')
                .addUserOption(option => option.setName('user').setDescription('The user to high-five').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('greet')
                .setDescription('Greet someone')
                .addUserOption(option => option.setName('user').setDescription('The user to greet').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cheer')
                .setDescription('Send encouragement to someone')
                .addUserOption(option => option.setName('user').setDescription('The user to cheer for').setRequired(true)))
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const config = actionConfigs[subcommand];

        if (!config) {
            return interaction.reply({ content: '❌ Unknown action!', flags: MessageFlags.Ephemeral });
        }

        if (config.selfError && user.id === interaction.user.id) {
            return interaction.reply({ content: `❌ ${config.selfError}`, flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        const tags = config.endpoints
            .map(endpoint => endpoint.split('/').pop())
            .filter(Boolean);

        const gifUrl = await getGifFromApi(tags, false, `action:${subcommand}`);

        const embed = new EmbedBuilder()
            .setTitle(config.title)
            .setDescription(config.actionText(interaction.user, user))
            .setColor(0x212121);

        if (gifUrl) {
            try {
                logger.debug(`Downloading GIF: ${gifUrl}`);
                const gifResponse = await axios.get(gifUrl, {
                    responseType: 'arraybuffer',
                    timeout: 7000,
                    maxRedirects: 5
                });
                const attachment = new AttachmentBuilder(gifResponse.data, { name: `${subcommand}.gif` });
                embed.setImage(`attachment://${subcommand}.gif`);
                await interaction.followUp({ embeds: [embed], files: [attachment] });
            } catch (error) {
                logger.error(`Error downloading gif: ${error.message}`);
                embed.setImage(gifUrl);
                await interaction.followUp({ embeds: [embed] });
            }
        } else {
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
