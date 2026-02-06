const path = require('path');
const puppeteer = require('puppeteer');

async function startHeadlessBridge(options = {}) {
    const url = options.url;
    if (!url) {
        throw new Error('Headless bridge URL is required.');
    }

    const userDataDir = options.userDataDir
        ? path.resolve(options.userDataDir)
        : path.resolve('puter-browser-data');

    const browser = await puppeteer.launch({
        headless: options.headless !== false,
        slowMo: options.slowMoMs || 0,
        userDataDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    const page = await browser.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (text) {
            console.log(`[PuterBridge] ${text}`);
        }
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    return { browser, page };
}

module.exports = { startHeadlessBridge };
