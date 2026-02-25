const { PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');

const PURGE_PREFIX = '.purge';
const MAX_PURGE = 1000;

function parsePurgeAmount(content) {
    const parts = String(content || '').trim().split(/\s+/);
    if (parts[0]?.toLowerCase() !== PURGE_PREFIX) return null;

    const amountRaw = parts[1];
    if (!amountRaw) return { error: 'Usage: `.purge <1-1000>`' };

    const amount = Number.parseInt(amountRaw, 10);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_PURGE) {
        return { error: 'Please provide a number between `1` and `1000`.' };
    }

    return { amount };
}

async function sendTemporary(channel, content, ttlMs = 5000) {
    try {
        const msg = await channel.send(content);
        setTimeout(() => msg.delete().catch(() => null), ttlMs);
    } catch {
        return;
    }
}

async function handlePurge(message, amount) {
    if (!message.guild || !message.channel) return true;

    const member = message.member;
    if (!member?.permissions?.has(PermissionsBitField.Flags.ManageMessages)) {
        await sendTemporary(message.channel, '❌ You need `Manage Messages` permission to use this command.');
        return true;
    }

    const botMember = message.guild.members.me;
    if (!botMember?.permissions?.has(PermissionsBitField.Flags.ManageMessages)) {
        await sendTemporary(message.channel, '❌ I need `Manage Messages` permission to purge messages.');
        return true;
    }

    await message.delete().catch(() => null);

    let remaining = amount;
    let deleted = 0;

    while (remaining > 0) {
        const batch = Math.min(remaining, 100);
        const purged = await message.channel.bulkDelete(batch, true).catch((error) => {
            logger.error(`Purge failed: ${error.message || error}`);
            return null;
        });

        if (!purged) break;

        deleted += purged.size;
        remaining -= batch;

        if (purged.size === 0) break;
    }

    await sendTemporary(message.channel, `🧹 Purged ${deleted} message(s).`, 6000);
    return true;
}

async function handlePrefixModeration(message) {
    const parsed = parsePurgeAmount(message.content);
    if (!parsed) return false;

    if (parsed.error) {
        await sendTemporary(message.channel, `❌ ${parsed.error}`);
        return true;
    }

    return handlePurge(message, parsed.amount);
}

module.exports = { handlePrefixModeration };
