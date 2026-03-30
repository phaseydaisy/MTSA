const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
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
        ),
    async execute(interaction) {
        if (interaction.options.getSubcommand() !== 'caption') return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

        // Make the white header taller and dynamically size/wrap text so it fits
        const topHeight = Math.max(120, Math.round(image.height * 0.12));
        const canvas = createCanvas(image.width, image.height + topHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, topHeight, image.width, image.height);

        // Draw white header
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, image.width, topHeight);

        // Text styling and wrapping: start with a font size based on header height
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

        // Reduce font size until text block fits within header height
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
        const file = new AttachmentBuilder(buffer, { name: 'caption.png' });
        await interaction.editReply({ files: [file] });
    }
};
