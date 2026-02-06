const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

function startPuterBridge(options = {}) {
    const port = options.port || 3777;
    const timeoutMs = options.timeoutMs || 20000;

    const app = express();
    app.use(express.json({ limit: '1mb' }));

    const publicDir = path.join(__dirname, 'public');
    app.use(express.static(publicDir));
    app.get('/', (req, res) => {
        res.sendFile(path.join(publicDir, 'ai-bridge.html'));
    });

    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

    let activeClient = null;
    const pending = new Map();

    function cleanupPending(id, error) {
        const entry = pending.get(id);
        if (!entry) return;
        clearTimeout(entry.timeoutId);
        pending.delete(id);
        if (error) {
            entry.reject(error);
        }
    }

    wss.on('connection', ws => {
        activeClient = ws;

        ws.on('message', raw => {
            try {
                const message = JSON.parse(String(raw));
                if (message.type !== 'chat-result') return;

                const entry = pending.get(message.id);
                if (!entry) return;

                clearTimeout(entry.timeoutId);
                pending.delete(message.id);

                if (message.ok) {
                    entry.resolve(message.text || '');
                } else {
                    entry.reject(new Error(message.error || 'Puter chat failed.'));
                }
            } catch (error) {
                return;
            }
        });

        ws.on('close', () => {
            if (activeClient === ws) {
                activeClient = null;
            }
        });
    });

    app.post('/api/chat', async (req, res) => {
        if (!activeClient || activeClient.readyState !== WebSocket.OPEN) {
            return res.status(503).json({ error: 'Puter bridge not connected.' });
        }

        const prompt = typeof req.body.prompt === 'string' ? req.body.prompt : '';
        const model = typeof req.body.model === 'string' ? req.body.model : 'gpt-5-nano';
        const systemPrompt = typeof req.body.systemPrompt === 'string' ? req.body.systemPrompt : '';

        if (!prompt.trim()) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }

        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        try {
            const result = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    cleanupPending(requestId, new Error('Puter bridge timeout.'));
                }, timeoutMs);

                pending.set(requestId, { resolve, reject, timeoutId });

                activeClient.send(JSON.stringify({
                    type: 'chat',
                    id: requestId,
                    prompt,
                    model,
                    systemPrompt
                }));
            });

            return res.json({ text: result });
        } catch (error) {
            cleanupPending(requestId, error);
            return res.status(500).json({ error: error.message || 'Bridge error.' });
        }
    });

    server.listen(port, () => {
        console.log(`Puter bridge listening on http://localhost:${port}`);
        console.log(`Open http://localhost:${port}/ in a browser to connect Puter.`);
    });

    return { server, wss };
}

module.exports = { startPuterBridge };
