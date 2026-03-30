const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const fs = require('fs');
const path = require('path');
const fontPath = path.join(__dirname, '../utils/FuturaCondensedBold.ttf');
console.log('Font exists:', fs.existsSync(fontPath));


registerFont(path.join(__dirname, '../utils/FuturaCondensedBold.ttf'), { family: 'FuturaCondensedBold' });

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
        const canvas = createCanvas(image.width, image.height + 80);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 80, image.width, image.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, image.width, 80);
        ctx.font = '60px "FuturaCondensedBold"';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.toUpperCase(), image.width / 2, 40);
        const buffer = canvas.toBuffer('image/png');
        const file = new AttachmentBuilder(buffer, { name: 'caption.png' });
        await interaction.editReply({ files: [file] });
    }
};
