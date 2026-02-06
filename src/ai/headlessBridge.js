const path = require('path');

function loadChromium() {
    try {
        // eslint-disable-next-line global-require
        return require('@sparticuz/chromium');
    } catch (error) {
        return null;
    }
}

function loadPuppeteerCore() {
    try {
        // eslint-disable-next-line global-require
        return require('puppeteer-core');
    } catch (error) {
        return null;
    }
}

function loadPuppeteer() {
    try {
        // eslint-disable-next-line global-require
        return require('puppeteer');
    } catch (error) {
        return null;
    }
}

async function startHeadlessBridge(options = {}) {
    const url = options.url;
    if (!url) {
        throw new Error('Headless bridge URL is required.');
    }

    const userDataDir = options.userDataDir
        ? path.resolve(options.userDataDir)
        : path.resolve('puter-browser-data');

    const chromium = loadChromium();
    let puppeteer = loadPuppeteerCore();
    let useChromiumPackage = false;

    if (chromium && puppeteer) {
        useChromiumPackage = true;
    } else {
        puppeteer = loadPuppeteer() || puppeteer;
    }

    if (!puppeteer) {
        throw new Error('No puppeteer runtime available.');
    }

    const cacheDir = path.join(path.dirname(userDataDir), 'puter-cache');
    const launchOptions = {
        headless: options.headless !== false,
        slowMo: options.slowMoMs || 0,
        userDataDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            `--disk-cache-dir=${cacheDir}`,
            `--media-cache-dir=${cacheDir}`
        ]
    };

    if (useChromiumPackage) {
        launchOptions.args = chromium.args;
        launchOptions.defaultViewport = chromium.defaultViewport;
        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.headless = options.headless !== undefined
            ? options.headless
            : chromium.headless;
    } else {
        const executablePath = options.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH;
        if (executablePath) {
            launchOptions.executablePath = executablePath;
        } else if (puppeteer && puppeteer.name === 'puppeteer-core') {
            throw new Error('PUPPETEER_EXECUTABLE_PATH is required with puppeteer-core.');
        }
    }

    const browser = await puppeteer.launch(launchOptions);

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
