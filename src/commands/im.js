const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const utilsDir = path.join(__dirname, '../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('im')
        .setDescription('Image commands')
        .addSubcommand(sub =>
            sub.setName('caption')
                .setDescription('Add a caption to an image')
                .addStringOption(opt =>
                    opt.setName('text')
                        .setDescription('Caption text')
                        .setRequired(true))
                .addAttachmentOption(opt =>
                    opt.setName('image')
                        .setDescription('Image file to caption'))
                .addStringOption(opt =>
                    opt.setName('link')
                        .setDescription('Direct image URL'))
                .addBooleanOption(opt =>
                    opt.setName('togif')
                        .setDescription('Convert result to GIF (optional)')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('togif')
                .setDescription('Convert an image to GIF')
                .addAttachmentOption(opt =>
                    opt.setName('image')
                        .setDescription('Image file to convert'))
                .addStringOption(opt =>
                    opt.setName('link')
                        .setDescription('Direct image URL'))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'togif') {
            return await handleTogif(interaction);
        }
        
        if (subcommand !== 'caption') return;

        // Lazy-load canvas to avoid crashing the whole bot if the native dependency is missing
        let createCanvas, loadImage, registerFont;
        try {
            ({ createCanvas, loadImage, registerFont } = require('canvas'));
        } catch (err) {
            return interaction.editReply({ content: 'Image generation is unavailable on this host because the optional `canvas` dependency failed to load. Install `canvas` (and native prerequisites) to enable this command.' });
        }

        // Register a font automatically:
        // - If IM_FONT_FILE env var is set, use that file (absolute or relative to utils dir)
        // - Else pick a .ttf/.otf in `src/utils`, preferring names containing 'futura'/'condensed'/'extra'/'black'
        let detectedFontFile = null;
        try {
            if (process.env.IM_FONT_FILE) {
                const candidate = process.env.IM_FONT_FILE;
                const candidatePath = path.isAbsolute(candidate) ? candidate : path.join(utilsDir, candidate);
                if (fs.existsSync(candidatePath)) detectedFontFile = candidatePath;
            }
            if (!detectedFontFile && fs.existsSync(utilsDir)) {
                const candidates = fs.readdirSync(utilsDir).filter(f => f.toLowerCase().endsWith('.ttf') || f.toLowerCase().endsWith('.otf'));
                const prefer = candidates.find(f => /futura|condensed|extra|black/i.test(f));
                const chosen = prefer || candidates[0];
                if (chosen) detectedFontFile = path.join(utilsDir, chosen);
            }
        } catch (e) {
            // ignore detection errors
        }

        let fontFamily = 'FuturaCondensedBold';
        try {
            if (detectedFontFile && fs.existsSync(detectedFontFile)) {
                const base = path.basename(detectedFontFile, path.extname(detectedFontFile));
                fontFamily = base.replace(/[^a-zA-Z0-9_]/g, '_') || fontFamily;
                registerFont(detectedFontFile, { family: fontFamily });
            }
        } catch (e) {
            // ignore font registration errors
        }

        const text = interaction.options.getString('text');
        const imageAttachment = interaction.options.getAttachment('image');
        const imageUrl = interaction.options.getString('link');
        let imgSrc;
        if (imageAttachment) {
            imgSrc = imageAttachment.url;
        } else if (imageUrl) {
            imgSrc = imageUrl;
        } else {
            return interaction.editReply({ content: 'Please provide an image or a direct image link.' });
        }

        let image;
        try {
            image = await loadImage(imgSrc);
        } catch (e) {
            return interaction.editReply({ content: 'Failed to load the image. Make sure the link is direct and valid.' });
        }

        const topHeight = Math.max(120, Math.round(image.height * 0.12));
        const canvas = createCanvas(image.width, image.height + topHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, topHeight, image.width, image.height);

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, image.width, topHeight);

        const maxTextWidth = Math.max(100, image.width - 40);
        let fontSize = Math.max(28, Math.floor(topHeight * 0.6));
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const wrapText = (ctx, text, maxWidth) => {
            const words = String(text).split(/\s+/).filter(Boolean);
            if (words.length === 0) return [''];
            const lines = [];
            let line = words[0];
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const testLine = line + ' ' + word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line.length > 0) {
                    lines.push(line);
                    line = word;
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            return lines;
        };

        let lines = [];
        const minFontSize = 18;
        while (fontSize >= minFontSize) {
            ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
            lines = wrapText(ctx, text, maxTextWidth);
            const lineHeight = Math.ceil(fontSize * 1.1);
            const textBlockHeight = lines.length * lineHeight;
            if (textBlockHeight <= topHeight - 16) break;
            fontSize -= 2;
        }

        ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
        const lineHeight = Math.ceil(fontSize * 1.1);
        // Center the block vertically within the header
        const centerY = topHeight / 2;
        const startOffset = (lines.length - 1) / 2;
        for (let i = 0; i < lines.length; i++) {
            const y = centerY + (i - startOffset) * lineHeight;
            ctx.fillText(lines[i], image.width / 2, y);
        }
        const buffer = canvas.toBuffer('image/png');
        const shouldTogif = interaction.options.getBoolean('togif');
        
        if (shouldTogif) {
            await convertToGif(interaction, buffer, 'caption.png');
        } else {
            const file = new AttachmentBuilder(buffer, { name: 'caption.png' });
            await interaction.editReply({ files: [file] });
        }
    }
};

async function handleTogif(interaction) {
    const imageAttachment = interaction.options.getAttachment('image');
    const imageUrl = interaction.options.getString('link');
    
    if (!imageAttachment && !imageUrl) {
        return interaction.editReply({ content: 'Please provide an image or a direct image link.' });
    }

    const imgSrc = imageAttachment ? imageAttachment.url : imageUrl;

    try {
        // Fetch the image
        const response = await axios.get(imgSrc, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const fileName = imageAttachment?.name || inferNameFromUrl(imgSrc) || 'image.png';
        await convertToGif(interaction, buffer, fileName);
    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: 'Failed to process the image. Make sure the link is direct and valid.' });
    }
}

async function convertToGif(interaction, buffer, originalName) {
    try {
        const gifBuffer = await convertBufferToGif(buffer, originalName);
        const gifFile = new AttachmentBuilder(gifBuffer, { name: 'converted.gif' });
        await interaction.editReply({ files: [gifFile] });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: 'GIF conversion failed. Make sure ffmpeg is installed and the image is valid.' });
    }
}

function inferNameFromUrl(urlString) {
    try {
        const pathname = new URL(urlString).pathname;
        return pathname ? path.basename(pathname) : null;
    } catch {
        return null;
    }
}

function execFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args, { stdio: 'ignore', windowsHide: true });
        ffmpeg.on('error', reject);
        ffmpeg.on('close', code => {
            if (code === 0) return resolve();
            reject(new Error(`ffmpeg exited with code ${code}`));
        });
    });
}

async function convertBufferToGif(buffer, originalName) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-gif-'));
    const inputPath = path.join(tmpDir, originalName);
    const palettePath = path.join(tmpDir, 'palette.png');
    const outputPath = path.join(tmpDir, 'output.gif');

    try {
        fs.writeFileSync(inputPath, buffer);
        await execFfmpeg(['-y', '-i', inputPath, '-vf', 'palettegen', palettePath]);
        await execFfmpeg(['-y', '-i', inputPath, '-i', palettePath, '-lavfi', 'paletteuse', '-r', '15', outputPath]);
        return fs.readFileSync(outputPath);
    } finally {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.error('Failed to clean up temp files:', cleanupError);
        }
    }
}
