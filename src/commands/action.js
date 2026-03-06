const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');
const getGifFromApi = require('../utils/getGifFromApi');

const actionConfigs = {
    hug: {
        title: '🤗 HUG!',
        endpoints: ['https://api.phawse.lol/gif/hug'],
        actionText: (user, target) => `${user} hugs ${target}!`,
        selfError: "You can't hug yourself! Find someone else to hug."
    },
    kiss: {
        title: '💋 KISS!',
        endpoints: ['https://api.phawse.lol/gif/kiss'],
        actionText: (user, target) => `${user} kisses ${target}!`,
        selfError: "You can't kiss yourself! Find someone else."
    },
    slap: {
        title: '✋ SLAP!',
        endpoints: ['https://api.phawse.lol/gif/slap'],
        actionText: (user, target) => `${user} slaps ${target}!`,
        selfError: "You can't slap yourself! That's weird."
    },
    bite: {
        title: '🦷 BITE!',
        endpoints: ['https://api.phawse.lol/gif/bite'],
        actionText: (user, target) => `${user} bites ${target}!`,
        selfError: "You can't bite yourself!"
    },
    nuzzle: {
        title: '😊 NUZZLE!',
        endpoints: ['https://api.phawse.lol/gif/nuzzle'],
        actionText: (user, target) => `${user} nuzzles ${target}!`,
        selfError: "You can't nuzzle yourself! Find someone else."
    },
    pet: {
        title: '🐾 PET!',
        endpoints: ['https://api.phawse.lol/gif/pat'],
        actionText: (user, target) => `${user} pets ${target}!`,
        selfError: "You can't pet yourself!"
    },
    lick: {
        title: '👅 LICK!',
        endpoints: ['https://api.phawse.lol/gif/lick'],
        actionText: (user, target) => `${user} licks ${target}!\n\n-# *slurp* 😜`,
        selfError: "You can't lick yourself!"
    },
    tickle: {
        title: '😂 TICKLE!',
        endpoints: ['https://api.phawse.lol/gif/tickle'],
        actionText: (user, target) => `${user} tickles ${target}!`,
        selfError: "You can't tickle yourself!"
    },
    poke: {
        title: '👉 POKE!',
        endpoints: ['https://api.phawse.lol/gif/poke'],
        actionText: (user, target) => `${user} pokes ${target}!\n\n-# *poke poke* 😝`,
        selfError: "You can't poke yourself!"
    },
    pinch: {
        title: '🤏 PINCH!',
        endpoints: ['https://api.phawse.lol/gif/pinch'],
        actionText: (user, target) => `${user} pinches ${target}!\n\n-# *ouch!* 😣`,
        selfError: "You can't pinch yourself!"
    },
    boop: {
        title: '👃 BOOP!',
        endpoints: ['https://api.phawse.lol/gif/boop'],
        actionText: (user, target) => `${user} boops ${target} on the nose!\n\n-# *boop* 💫`,
        selfError: "You can't boop yourself!"
    },
    handhold: {
        title: '🤝 HANDHOLD!',
        endpoints: ['https://api.phawse.lol/gif/handhold'],
        actionText: (user, target) => `${user} holds hands with ${target}!\n\n-# *so romantic* 💕`,
        selfError: "You can't hold your own hand!"
    },
    highfive: {
        title: '🙌 HIGH-FIVE!',
        endpoints: ['https://api.phawse.lol/gif/highfive'],
        actionText: (user, target) => `${user} high-fives ${target}!\n\n-# *SLAP!* 🎉`,
        selfError: "You can't high-five yourself!"
    },
    dance: {
        title: '💃 DANCE!',
        endpoints: ['https://api.phawse.lol/gif/dance'],
        actionText: (user, target) => target
            ? `${user} dances with ${target}! 💃🕺`
            : `${user} is dancing! 💃🕺`,
        selfError: null
    },
    greet: {
        title: '👋 GREET!',
        endpoints: ['https://api.phawse.lol/gif/wave'],
        actionText: (user, target) => `${user} greets ${target}! Hello! 👋`,
        selfError: "You can't greet yourself!"
    },
    cheer: {
        title: '✨ CHEER!',
        endpoints: ['https://api.phawse.lol/gif/happy'],
        actionText: (user, target) => `${user} sends some encouragement to ${target}!`,
        selfError: null
    },
    throw: {
        title: '🌀 THROW!',
        endpoints: ['https://api.phawse.lol/gif/yeet'],
        actionText: (user, target) => `${user} throws ${target}!`,
        selfError: "You can't throw yourself!"
    },
    shoot: {
        title: '🔫 SHOOT!',
        endpoints: ['https://api.phawse.lol/gif/shoot'],
        actionText: (user, target) => `${user} shoots ${target}!`,
        selfError: "You can't shoot yourself!"
    },
    kick: {
        title: '🦵 KICK!',
        endpoints: ['https://api.phawse.lol/gif/kick'],
        actionText: (user, target) => `${user} kicks ${target}!`,
        selfError: "You can't kick yourself!"
    },
    lurk: {
        title: '🕶️ LURK!',
        endpoints: ['https://api.phawse.lol/gif/lurk'],
        actionText: (user, target) => target
            ? `${user} lurks around ${target}...`
            : `${user} is lurking in the shadows...`,
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
                .setName('dance')
                .setDescription('Dance solo or with someone')
                .addUserOption(option => option.setName('with').setDescription('Who to dance with').setRequired(false)))
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
        .addSubcommand(subcommand =>
            subcommand
                .setName('throw')
                .setDescription('Throw someone')
                .addUserOption(option => option.setName('user').setDescription('The user to throw').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shoot')
                .setDescription('Shoot someone')
                .addUserOption(option => option.setName('user').setDescription('The user to shoot').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick someone')
                .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lurk')
                .setDescription('Lurk around someone')
                .addUserOption(option => option.setName('user').setDescription('The user to lurk around').setRequired(false)))
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1]),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = subcommand === 'dance'
            ? interaction.options.getUser('with')
            : interaction.options.getUser('user');
        const config = actionConfigs[subcommand];

        if (!config) {
            return interaction.reply({ content: '❌ Unknown action!', flags: MessageFlags.Ephemeral });
        }

        if (subcommand !== 'lurk' && subcommand !== 'dance' && !user) {
            return interaction.reply({ content: '❌ You must specify a user!', flags: MessageFlags.Ephemeral });
        }

        if (config.selfError && user && user.id === interaction.user.id) {
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
