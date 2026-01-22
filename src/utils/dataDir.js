const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'jsons');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const resolveDataFile = (name) => path.join(dataDir, name);

module.exports = { resolveDataFile };
