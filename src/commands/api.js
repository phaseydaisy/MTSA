const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const logger = require('../utils/logger');

const JIKAN_BASE = 'https://api.jikan.moe/v4';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('api')
        .setDescription('API commands for external services')
        .addSubcommandGroup(group =>
            group
                .setName('jikan')
                .setDescription('Jikan (MyAnimeList) API')
                .addSubcommand(sub =>
                    sub
                        .setName('search')
                        .setDescription('Search anime by title (paged)')
                        .addStringOption(opt => opt.setName('query').setDescription('Search query').setRequired(true)))
                .addSubcommand(sub =>
                    sub
                        .setName('character')
                        .setDescription('Search characters by name')
                        .addStringOption(opt => opt.setName('name').setDescription('Character name').setRequired(true)))
                .addSubcommand(sub =>
                    sub
                        .setName('stats')
                        .setDescription('Show stats for an anime (search by title)')
                        .addStringOption(opt => opt.setName('query').setDescription('Anime title').setRequired(true)))
                // removed 'get' by id per request
                .addSubcommand(sub =>
                    sub
                        .setName('top')
                        .setDescription('Show top anime')
                        .addIntegerOption(opt => opt.setName('limit').setDescription('Number of results (default 5)').setRequired(false)))
                .addSubcommand(sub =>
                    sub
                        .setName('random')
                        .setDescription('Get a random anime'))
                .addSubcommand(sub =>
                    sub
                        .setName('manga')
                        .setDescription('Search manga by title (paged)')
                        .addStringOption(opt => opt.setName('query').setDescription('Search query').setRequired(true)))
                .addSubcommand(sub =>
                    sub
                        .setName('recent')
                        .setDescription('Show recent anime episode releases'))),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand(false);

        if (group !== 'jikan') {
            return interaction.editReply({ content: '❌ Unknown API group', flags: MessageFlags.Ephemeral });
        }

        // interaction is already deferred by the central handler in index.js

        try {
            if (sub === 'search') {
                const q = interaction.options.getString('query', true);
                const res = await axios.get(`${JIKAN_BASE}/anime`, { params: { q, limit: 20 } });
                const list = res.data && res.data.data;
                if (!list || !list.length) return interaction.editReply({ content: 'No results found.', flags: MessageFlags.Ephemeral });

                let index = 0;
                const render = (item) => {
                    const title = item.title || item.title_english || item.title_japanese || 'Unknown';
                    const url = item.url || (item.mal_id ? `https://myanimelist.net/anime/${item.mal_id}` : null);
                    const synopsis = item.synopsis || 'No synopsis available.';
                    const score = item.score ?? 'N/A';
                    const image = (item.images && item.images.jpg && item.images.jpg.image_url) || (item.images && item.images.webp && item.images.webp.image_url) || null;

                    const embed = new EmbedBuilder()
                        .setTitle(`${title} (${index + 1}/${list.length})`)
                        .setDescription(synopsis.length > 700 ? synopsis.slice(0, 700) + '…' : synopsis)
                        .setColor(0x2b2d31)
                        .setURL(url)
                        .setFooter({ text: `Score: ${score}` });

                    if (image) embed.setImage(image);
                    return embed;
                };

                const prev = new ButtonBuilder().setCustomId('prev').setLabel('◀️ Prev').setStyle(ButtonStyle.Primary).setDisabled(true);
                const next = new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(list.length <= 1);
                const row = new ActionRowBuilder().addComponents(prev, next);

                await interaction.editReply({ embeds: [render(list[index])], components: [row] });
                const message = await interaction.fetchReply();

                const collector = message.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'This paginator is not for you.', ephemeral: true });
                    if (i.customId === 'prev') {
                        index = (index - 1 + list.length) % list.length;
                    } else if (i.customId === 'next') {
                        index = (index + 1) % list.length;
                    }

                    prev.setDisabled(index === 0);
                    next.setDisabled(index >= list.length - 1);
                    const newRow = new ActionRowBuilder().addComponents(prev, next);
                    try {
                        await i.update({ embeds: [render(list[index])], components: [newRow] });
                    } catch (e) {
                        logger.error('Failed to update paginator:', e.message);
                    }
                });

                collector.on('end', async () => {
                    try {
                        await message.edit({ components: [] });
                    } catch (e) { /* ignore */ }
                });

                return;
            }

            if (sub === 'character') {
                const name = interaction.options.getString('name', true);
                const res = await axios.get(`${JIKAN_BASE}/characters`, { params: { q: name, limit: 5 } });
                const list = res.data && res.data.data;
                if (!list || !list.length) return interaction.editReply({ content: 'No characters found.', flags: MessageFlags.Ephemeral });

                const item = list[0];
                const title = item.name || 'Unknown';
                const url = item.url || (item.mal_id ? `https://myanimelist.net/character/${item.mal_id}` : null);
                const about = item.about || 'No description available.';
                const image = (item.images && item.images.jpg && item.images.jpg.image_url) || null;

                const roles = (item.anime && item.anime.slice(0,5).map(r => `${r.anime.title} (${r.role})`).join('\n')) || null;

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(about.length > 700 ? about.slice(0,700) + '…' : about)
                    .setColor(0x2b2d31)
                    .setURL(url);

                if (roles) embed.addFields({ name: 'Notable Roles', value: roles });
                if (image) embed.setThumbnail(image);

                return interaction.editReply({ embeds: [embed] });
            }

            if (sub === 'stats') {
                const q = interaction.options.getString('query', true);
                const res = await axios.get(`${JIKAN_BASE}/anime`, { params: { q, limit: 1 } });
                const item = res.data && res.data.data && res.data.data[0];
                if (!item) return interaction.editReply({ content: 'No anime found for stats.', flags: MessageFlags.Ephemeral });

                const title = item.title || 'Unknown';
                const url = item.url || (item.mal_id ? `https://myanimelist.net/anime/${item.mal_id}` : null);
                const score = item.score ?? 'N/A';
                const rank = item.rank ?? 'N/A';
                const popularity = item.popularity ?? 'N/A';
                const members = item.members ?? 'N/A';
                const favorites = item.favorites ?? 'N/A';

                const embed = new EmbedBuilder()
                    .setTitle(`${title} — Stats`)
                    .setURL(url)
                    .setColor(0x2b2d31)
                    .addFields(
                        { name: 'Score', value: String(score), inline: true },
                        { name: 'Rank', value: String(rank), inline: true },
                        { name: 'Popularity', value: String(popularity), inline: true },
                        { name: 'Members', value: String(members), inline: true },
                        { name: 'Favorites', value: String(favorites), inline: true }
                    );

                return interaction.editReply({ embeds: [embed] });
            }

            // 'get' subcommand removed

            if (sub === 'top') {
                const limit = Math.min(interaction.options.getInteger('limit') || 5, 20);
                const res = await axios.get(`${JIKAN_BASE}/top/anime`, { params: { limit } });
                const list = res.data && res.data.data;
                if (!list || !list.length) return interaction.editReply({ content: 'No results.', flags: MessageFlags.Ephemeral });

                const embed = new EmbedBuilder()
                    .setTitle('Top Anime')
                    .setColor(0x2b2d31)
                    .setDescription(list.slice(0, limit).map((a, i) => `${i + 1}. [${a.title}](${a.url || `https://myanimelist.net/anime/${a.mal_id}`}) — ${a.score ?? 'N/A'}`).join('\n'));

                return interaction.editReply({ embeds: [embed] });
            }

            if (sub === 'manga') {
                const q = interaction.options.getString('query', true);
                const res = await axios.get(`${JIKAN_BASE}/manga`, { params: { q, limit: 20 } });
                const list = res.data && res.data.data;
                if (!list || !list.length) return interaction.editReply({ content: 'No manga found.', flags: MessageFlags.Ephemeral });

                let index = 0;
                const render = (item) => {
                    const title = item.title || item.title_english || item.title_japanese || 'Unknown';
                    const url = item.url || (item.mal_id ? `https://myanimelist.net/manga/${item.mal_id}` : null);
                    const synopsis = item.synopsis || 'No synopsis available.';
                    const score = item.score ?? 'N/A';
                    const image = (item.images && item.images.jpg && item.images.jpg.image_url) || (item.images && item.images.webp && item.images.webp.image_url) || null;

                    const embed = new EmbedBuilder()
                        .setTitle(`${title} (${index + 1}/${list.length})`)
                        .setDescription(synopsis.length > 700 ? synopsis.slice(0, 700) + '…' : synopsis)
                        .setColor(0x2b2d31)
                        .setURL(url)
                        .setFooter({ text: `Score: ${score}` });

                    if (image) embed.setImage(image);
                    return embed;
                };

                const prev = new ButtonBuilder().setCustomId('prev').setLabel('◀️ Prev').setStyle(ButtonStyle.Primary).setDisabled(true);
                const next = new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(list.length <= 1);
                const row = new ActionRowBuilder().addComponents(prev, next);

                await interaction.editReply({ embeds: [render(list[index])], components: [row] });
                const message = await interaction.fetchReply();

                const collector = message.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'This paginator is not for you.', ephemeral: true });
                    if (i.customId === 'prev') {
                        index = (index - 1 + list.length) % list.length;
                    } else if (i.customId === 'next') {
                        index = (index + 1) % list.length;
                    }

                    prev.setDisabled(index === 0);
                    next.setDisabled(index >= list.length - 1);
                    const newRow = new ActionRowBuilder().addComponents(prev, next);
                    try {
                        await i.update({ embeds: [render(list[index])], components: [newRow] });
                    } catch (e) {
                        logger.error('Failed to update manga paginator:', e.message);
                    }
                });

                collector.on('end', async () => {
                    try {
                        await message.edit({ components: [] });
                    } catch (e) { /* ignore */ }
                });

                return;
            }

            if (sub === 'recent') {
                const res = await axios.get(`${JIKAN_BASE}/watch/episodes`);
                const list = res.data && res.data.data;
                if (!list || !list.length) return interaction.editReply({ content: 'No recent episodes found.', flags: MessageFlags.Ephemeral });

                const recent = list.slice(0, 10);
                const embed = new EmbedBuilder()
                    .setTitle('📺 Recent Episode Releases')
                    .setColor(0x2b2d31)
                    .setDescription(recent.map((ep, i) => {
                        const title = ep.entry?.title || 'Unknown';
                        const ep_num = ep.episode || 'N/A';
                        const url = ep.entry?.url || '#';
                        return `${i + 1}. [${title}](${url}) - Episode ${ep_num}`;
                    }).join('\n'));

                return interaction.editReply({ embeds: [embed] });
            }

            if (sub === 'random') {
                // Jikan provides a random endpoint; fall back to sampling if unavailable
                let item = null;
                try {
                    const r = await axios.get(`${JIKAN_BASE}/random/anime`);
                    item = r.data && r.data.data;
                } catch (e) {
                    logger.debug('Random endpoint failed, falling back to top sampling');
                }

                if (!item) {
                    const r = await axios.get(`${JIKAN_BASE}/top/anime`, { params: { limit: 50 } });
                    const arr = r.data && r.data.data;
                    if (!arr || !arr.length) return interaction.editReply({ content: 'No results.', flags: MessageFlags.Ephemeral });
                    item = arr[Math.floor(Math.random() * arr.length)];
                }

                const title = item.title || 'Unknown';
                const url = item.url || (item.mal_id ? `https://myanimelist.net/anime/${item.mal_id}` : null);
                const synopsis = item.synopsis || item.description || 'No synopsis available.';
                const score = item.score ?? 'N/A';
                const image = (item.images && item.images.jpg && item.images.jpg.image_url) || null;

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(synopsis.length > 700 ? synopsis.slice(0, 700) + '…' : synopsis)
                    .setColor(0x2b2d31)
                    .setURL(url)
                    .setFooter({ text: `Score: ${score}` });

                if (image) embed.setImage(image);

                return interaction.editReply({ embeds: [embed] });
            }

            return interaction.editReply({ content: '❌ Unknown jikan command', flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error(`Jikan API error: ${error.message}`);
            return interaction.editReply({ content: `API error: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    }
};
