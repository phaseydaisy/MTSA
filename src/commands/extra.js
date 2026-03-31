const fs = require('fs');
const path = require('path');
const { AttachmentBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');

const PURGE_PREFIX = '.purge';
const PING_PREFIX = '.ping';
const UPTIME_PREFIX = '.uptime';
const LOG_PREFIX = '.log';
const AUTHORIZED_LOG_USER_ID = '1161104305080762449';
const MAX_PURGE = 1000;
const BLACK_COLOR = 0x000000;

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

function parseLogCommand(content) {
    const parts = String(content || '').trim().split(/\s+/);
    if (parts[0]?.toLowerCase() !== LOG_PREFIX) return null;
    return parts.slice(1).map(part => part.toLowerCase());
}

function isPingCommand(content) {
    const parts = String(content || '').trim().split(/\s+/);
    return parts[0]?.toLowerCase() === PING_PREFIX;
}

function isUptimeCommand(content) {
    const parts = String(content || '').trim().split(/\s+/);
    return parts[0]?.toLowerCase() === UPTIME_PREFIX;
}

function isLogCommand(content) {
    return parseLogCommand(content) !== null;
}

function getMostRecentLogFile() {
    const candidateDirs = [
        path.join(__dirname, '..', 'logs'),
        path.join(__dirname, '..', '..', 'logs')
    ];

    const logsDir = candidateDirs.find(dir => fs.existsSync(dir));
    if (!logsDir) return null;

    const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
    if (logFiles.length === 0) return null;

    let latestFile = null;
    let latestMtime = 0;
    for (const fileName of logFiles) {
        const filePath = path.join(logsDir, fileName);
        try {
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs > latestMtime) {
                latestMtime = stat.mtimeMs;
                latestFile = filePath;
            }
        } catch {
            continue;
        }
    }

    if (!latestFile) return null;

    try {
        const contents = fs.readFileSync(latestFile, 'utf8');
        return {
            filePath: latestFile,
            fileName: path.basename(latestFile),
            contents
        };
    } catch {
        return null;
    }
}

function buildEmbed(description) {
    return new EmbedBuilder().setColor(BLACK_COLOR).setDescription(description);
}

function formatDuration(durationMs) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const days = Math.floor(totalSeconds / 86400);
    const parts = [];

    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

async function handlePing(message) {
    if (!message.channel) return true;

    const latency = Date.now() - message.createdTimestamp;
    const apiLatency = message.client?.ws?.ping ?? 0;
    const embed = buildEmbed(`🏓 Pong!

• Message latency: \`${latency}ms\`
• API latency: \`${apiLatency}ms\``);

    await message.channel.send({ embeds: [embed] }).catch(() => null);
    return true;
}

async function handleLogCommand(message) {
    if (!message.channel) return true;

    const args = parseLogCommand(message.content);
    if (!args) return false;

    if (message.author.id !== AUTHORIZED_LOG_USER_ID) {
        await sendTemporary(message.channel, '❌ You are not authorized to use this command.');
        return true;
    }

    const subcommand = args[0];
    if (!subcommand) {
        await sendTemporary(message.channel, '❌ Usage: `.log recent`, `.log clean`, `.log files`, or `.log delete <filename>`');
        return true;
    }

    if (subcommand === 'recent') {
        const recentLogFile = getMostRecentLogFile();
        if (!recentLogFile) {
            await sendTemporary(message.channel, '❌ No recent log file found.');
            return true;
        }

        const { filePath, fileName, contents } = recentLogFile;
        const trimmed = String(contents || '').trim();
        const embed = buildEmbed(`📄 Most recent log file: \`${fileName}\``);

        if (trimmed.length > 0 && trimmed.length <= 3800) {
            embed.setDescription(`📄 Most recent log file: \`${fileName}\`

\`\`\`
${trimmed}
\`\`\``);
            await message.channel.send({ embeds: [embed] }).catch(() => null);
            return true;
        }

        const attachment = new AttachmentBuilder(filePath);
        embed.setDescription(`📄 Most recent log file: \`${fileName}\` attached.`);
        await message.channel.send({ embeds: [embed], files: [attachment] }).catch(() => null);
        return true;
    }

    if (subcommand === 'clean') {
        const candidateDirs = [
            path.join(__dirname, '..', 'logs'),
            path.join(__dirname, '..', '..', 'logs')
        ];

        const logsDir = candidateDirs.find(dir => fs.existsSync(dir));
        if (!logsDir) {
            await sendTemporary(message.channel, '❌ Logs directory not found.');
            return true;
        }

        const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
        if (logFiles.length === 0) {
            await sendTemporary(message.channel, '✅ No log files to clean.');
            return true;
        }

        let deletedCount = 0;
        for (const fileName of logFiles) {
            const filePath = path.join(logsDir, fileName);
            try {
                fs.unlinkSync(filePath);
                deletedCount++;
            } catch (error) {
                logger.error(`Failed to delete log file ${fileName}: ${error.message || error}`);
            }
        }

        await sendTemporary(message.channel, `🧹 Cleaned ${deletedCount} log file(s).`);
        return true;
    }

    if (subcommand === 'files') {
        const candidateDirs = [
            path.join(__dirname, '..', 'logs'),
            path.join(__dirname, '..', '..', 'logs')
        ];

        const logsDir = candidateDirs.find(dir => fs.existsSync(dir));
        if (!logsDir) {
            await sendTemporary(message.channel, '❌ Logs directory not found.');
            return true;
        }

        const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
        if (logFiles.length === 0) {
            await sendTemporary(message.channel, '📁 No log files found.');
            return true;
        }

        // Sort files by modification time (newest first)
        const fileDetails = logFiles.map(fileName => {
            const filePath = path.join(logsDir, fileName);
            try {
                const stat = fs.statSync(filePath);
                return {
                    name: fileName,
                    size: stat.size,
                    mtime: stat.mtime
                };
            } catch {
                return {
                    name: fileName,
                    size: 0,
                    mtime: new Date(0)
                };
            }
        }).sort((a, b) => b.mtime - a.mtime);

        const fileList = fileDetails.map((file, index) => {
            const sizeKB = (file.size / 1024).toFixed(1);
            const dateStr = file.mtime.toISOString().split('T')[0];
            return `${index + 1}. \`${file.name}\` - ${sizeKB} KB - ${dateStr}`;
        }).join('\n');

        const embed = buildEmbed(`📁 Log files (${logFiles.length} total):

${fileList}`);
        await message.channel.send({ embeds: [embed] }).catch(() => null);
        return true;
    }

    if (subcommand === 'delete') {
        const fileName = args[1];
        if (!fileName) {
            await sendTemporary(message.channel, '❌ Usage: `.log delete <filename>`\n💡 Tip: Use `.log files` to see available log files first.');
            return true;
        }

        // Validate filename - must end with .log and not contain path traversal
        if (!fileName.endsWith('.log') || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            await sendTemporary(message.channel, '❌ Invalid filename. Only `.log` files are allowed and path traversal is not permitted.');
            return true;
        }

        const candidateDirs = [
            path.join(__dirname, '..', 'logs'),
            path.join(__dirname, '..', '..', 'logs')
        ];

        const logsDir = candidateDirs.find(dir => fs.existsSync(dir));
        if (!logsDir) {
            await sendTemporary(message.channel, '❌ Logs directory not found.');
            return true;
        }

        const filePath = path.join(logsDir, fileName);
        if (!fs.existsSync(filePath)) {
            await sendTemporary(message.channel, `❌ Log file \`${fileName}\` not found. Use \`.log files\` to see available files.`);
            return true;
        }

        try {
            fs.unlinkSync(filePath);
            await sendTemporary(message.channel, `🗑️ Successfully deleted log file: \`${fileName}\``);
        } catch (error) {
            logger.error(`Failed to delete log file ${fileName}: ${error.message || error}`);
            await sendTemporary(message.channel, `❌ Failed to delete log file \`${fileName}\`. Check logs for details.`);
        }
        return true;
    }

    await sendTemporary(message.channel, '❌ Unknown subcommand. Usage: `.log recent`, `.log clean`, `.log files`, or `.log delete <filename>`');
    return true;
}

async function handleUptime(message) {
    if (!message.channel) return true;

    const uptimeMs = message.client?.uptime ?? 0;
    const formatted = formatDuration(uptimeMs);
    const embed = buildEmbed(`⏱️ Uptime: \`${formatted}\``);

    await message.channel.send({ embeds: [embed] }).catch(() => null);
    return true;
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

async function sendTemporary(channel, content, ttlMs = 5000) {
    try {
        const msg = await channel.send(content);
        setTimeout(() => msg.delete().catch(() => null), ttlMs);
    } catch {
        return;
    }
}

async function handlePrefixCommands(message) {
    if (isLogCommand(message.content)) {
        return handleLogCommand(message);
    }

    if (isPingCommand(message.content)) {
        return handlePing(message);
    }

    if (isUptimeCommand(message.content)) {
        return handleUptime(message);
    }

    const parsed = parsePurgeAmount(message.content);
    if (!parsed) return false;

    if (parsed.error) {
        await sendTemporary(message.channel, `❌ ${parsed.error}`);
        return true;
    }

    return handlePurge(message, parsed.amount);
}

module.exports = { handlePrefixCommands };
