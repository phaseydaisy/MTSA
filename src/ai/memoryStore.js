const fs = require('fs');
const { resolveDataFile } = require('../utils/dataDir');

function getMemoryFilePath(options = {}) {
    const fileName = options.fileName || 'ai_memory.json';
    return resolveDataFile(fileName);
}

function loadMemoryMap(options = {}) {
    const filePath = getMemoryFilePath(options);
    if (!fs.existsSync(filePath)) {
        return new Map();
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        const entries = data && data.entries ? data.entries : {};
        const map = new Map();
        for (const key of Object.keys(entries)) {
            const value = Array.isArray(entries[key]) ? entries[key] : [];
            map.set(key, value);
        }
        return map;
    } catch (error) {
        return new Map();
    }
}

function saveMemoryMap(map, options = {}) {
    const filePath = getMemoryFilePath(options);
    const entries = {};
    for (const [key, value] of map.entries()) {
        entries[key] = Array.isArray(value) ? value : [];
    }

    fs.writeFileSync(filePath, JSON.stringify({ entries }, null, 2), 'utf8');
}

function createMemorySaver(map, options = {}) {
    const debounceMs = typeof options.saveDebounceMs === 'number' ? options.saveDebounceMs : 2000;
    let timer = null;

    function scheduleSave() {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            saveMemoryMap(map, options);
        }, debounceMs);
    }

    function flush() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        saveMemoryMap(map, options);
    }

    return { scheduleSave, flush };
}

module.exports = {
    loadMemoryMap,
    saveMemoryMap,
    createMemorySaver
};
