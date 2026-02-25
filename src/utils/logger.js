const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '..', 'logs');
        this.sessionId = this.getSessionId();
        this.ensureLogDir();
    }

    getSessionId() {
        const now = new Date();
        const date = now.toISOString().replace(/[:.]/g, '-');
        return `${date}-${process.pid}`;
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    getLogFileName() {
        return path.join(this.logsDir, `bot-${this.sessionId}.log`);
    }

    formatMessage(level, ...args) {
        const timestamp = new Date().toISOString();
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        return `[${timestamp}] [${level}] ${message}`;
    }

    writeToFile(formattedMessage) {
        try {
            const logFile = this.getLogFileName();
            fs.appendFileSync(logFile, formattedMessage + '\n', 'utf8');
        } catch (error) {
            // Intentionally silent: user requested file-only logging
        }
    }

    log(...args) {
        const formatted = this.formatMessage('INFO', ...args);
        this.writeToFile(formatted);
    }

    info(...args) {
        this.log(...args);
    }

    warn(...args) {
        const formatted = this.formatMessage('WARN', ...args);
        this.writeToFile(formatted);
    }

    error(...args) {
        const formatted = this.formatMessage('ERROR', ...args);
        this.writeToFile(formatted);
    }

    debug(...args) {
        const formatted = this.formatMessage('DEBUG', ...args);
        this.writeToFile(formatted);
    }

    command(commandName, user, guild) {
        const message = `Command: ${commandName} | User: ${user.tag} (${user.id}) | Guild: ${guild ? guild.name : 'DM'}`;
        const formatted = this.formatMessage('COMMAND', message);
        this.writeToFile(formatted);
    }

    interaction(type, user, details = '') {
        const message = `Interaction: ${type} | User: ${user.tag} (${user.id}) ${details}`;
        const formatted = this.formatMessage('INTERACTION', message);
        this.writeToFile(formatted);
    }

    voice(action, user, channel) {
        const message = `Voice: ${action} | User: ${user.tag} | Channel: ${channel ? channel.name : 'Unknown'}`;
        const formatted = this.formatMessage('VOICE', message);
        this.writeToFile(formatted);
    }

    ai(user, query, response) {
        const message = `AI Query | User: ${user.tag} | Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`;
        const formatted = this.formatMessage('AI', message);
        this.writeToFile(formatted);
    }

    api(endpoint, status, method = 'GET', details = '') {
        const message = `API ${method} ${endpoint} -> ${status} ${details}`;
        const formatted = this.formatMessage('API', message);
        this.writeToFile(formatted);
    }
}

const logger = new Logger();

module.exports = logger;
