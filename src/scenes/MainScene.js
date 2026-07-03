import { CONFIG } from '../config.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        const base = window.location.pathname.endsWith('/')
            ? window.location.pathname
            : window.location.pathname.replace(/\/[^/]*$/, '/');
        const a = base + 'assets/';
        this.load.setBaseURL('');
        this.load.setPath('');
        this.load.image('title', a + 'title.png');
        this.load.image('wolf', a + 'wolf.png');
        this.load.image('sheep', a + 'sheep.png');
    }

    async create() {
        await document.fonts.ready;
        const { width, height } = this.scale;

        this.add.graphics()
            .fillStyle(0xf5e6d3, 1)
            .fillRect(-2, -2, width + 4, height + 4);

        // Title image
        const titleY = height * 0.12;
        const titleSrc = this.textures.get('title').getSourceImage();
        const titleMaxW = width * 1.0;
        const titleScale = titleMaxW / titleSrc.width;
        const titleW = titleSrc.width * titleScale;
        const titleH = titleSrc.height * titleScale;
        this.add.image(width / 2, titleY, 'title').setDisplaySize(titleW, titleH);

        this.add.text(width / 2, titleY + titleH / 2 + 6, '양들을 칠해 늑대가 볼 수 없게하세요!', {
            fontSize: '14px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Buttons positioned from bottom
        const btnW = width * 0.6;
        const btnH = 44;
        const btnGap = 14;
        const btnBottomMargin = 15;
        const btnStartY = height - btnBottomMargin - (btnH * 3 + btnGap * 2);

        // Sheep blocks around wolf — centered between subtitle and buttons
        const subtitleBottom = titleY + titleH / 2 + 24;
        const centerY = subtitleBottom + (btnStartY - subtitleBottom) / 2;
        const sheepSrc = this.textures.get('sheep').getSourceImage();
        const sheepH = height * 0.07;
        const sheepScale = sheepH / sheepSrc.height;
        const sheepW = sheepSrc.width * sheepScale;
        const blockSize = Math.max(sheepW, sheepH) + 10;

        const blockDefs = [
            { colors: [0xE53935], mixed: 0xE53935 },
            { colors: [0xFFD600], mixed: 0xFFD600 },
            { colors: [0x2979FF], mixed: 0x2979FF },
            { colors: [0xE53935, 0xFFD600], mixed: 0xFF9100 },
            { colors: [0xE53935, 0x2979FF], mixed: 0x6A1B9A },
            { colors: [0xFFD600, 0x2979FF], mixed: 0x00C853 },
            { colors: 'rainbow', mixed: null },
            { colors: [0xE53935, 0xFFD600, 0x2979FF], mixed: 0x212121 },
        ];
        const positions = [
            { x: -1.3, y: -1.2 }, { x: 0, y: -1.4 }, { x: 1.3, y: -1.2 },
            { x: -1.6, y: 0.1 }, { x: 1.6, y: 0.1 },
            { x: -1.3, y: 1.2 }, { x: 0, y: 1.4 }, { x: 1.3, y: 1.2 },
        ];

        const colorMode = localStorage.getItem('paintSheep_colorMode') || 'mixed';

        for (let i = 0; i < positions.length; i++) {
            const px = width / 2 + positions[i].x * blockSize * 1.1;
            const py = centerY + positions[i].y * blockSize * 1.0;
            const { colors: colorArr, mixed } = blockDefs[i];

            const bg = this.add.graphics();
            const half = blockSize / 2;

            if (colorArr === 'rainbow') {
                const rainbowColors = [0x00BCD4, 0xE91E63, 0xFFEB3B, 0x2979FF, 0x00C853, 0xE53935];
                const stripeH = blockSize / rainbowColors.length;
                for (let s = 0; s < rainbowColors.length; s++) {
                    bg.fillStyle(rainbowColors[s], 1);
                    bg.fillRect(px - half, py - half + s * stripeH, blockSize, stripeH);
                }
            } else if (colorArr.length === 1 || colorMode === 'mixed') {
                const c = colorArr.length === 1 ? colorArr[0] : mixed;
                bg.fillStyle(c, 1);
                bg.fillRoundedRect(px - half, py - half, blockSize, blockSize, 8);
            } else if (colorArr.length === 2) {
                bg.fillStyle(colorArr[0], 1);
                bg.fillRoundedRect(px - half, py - half, blockSize, blockSize, 8);
                bg.fillStyle(colorArr[0], 1);
                bg.fillTriangle(px - half, py - half, px + half, py - half, px - half, py + half);
                bg.fillStyle(colorArr[1], 1);
                bg.fillTriangle(px + half, py - half, px + half, py + half, px - half, py + half);
            } else {
                const t = half * 0.45;
                bg.fillStyle(colorArr[0], 1);
                bg.fillRoundedRect(px - half, py - half, blockSize, blockSize, 8);
                bg.fillStyle(colorArr[0], 1);
                bg.beginPath();
                bg.moveTo(px - half, py - half);
                bg.lineTo(px + t, py - half);
                bg.lineTo(px - half, py + t);
                bg.closePath();
                bg.fillPath();
                bg.fillStyle(colorArr[1], 1);
                bg.beginPath();
                bg.moveTo(px + t, py - half);
                bg.lineTo(px + half, py - half);
                bg.lineTo(px + half, py - t);
                bg.lineTo(px - t, py + half);
                bg.lineTo(px - half, py + half);
                bg.lineTo(px - half, py + t);
                bg.closePath();
                bg.fillPath();
                bg.fillStyle(colorArr[2], 1);
                bg.beginPath();
                bg.moveTo(px + half, py - t);
                bg.lineTo(px + half, py + half);
                bg.lineTo(px - t, py + half);
                bg.closePath();
                bg.fillPath();
            }

            // Mask for rounded corners
            const mask = this.make.graphics();
            mask.fillStyle(0xffffff);
            mask.fillRoundedRect(px - half, py - half, blockSize, blockSize, 8);
            bg.setMask(mask.createGeometryMask());

            // Bottom row sheep (indices 5,6,7) appear in front of wolf
            const depth = i >= 5 ? 20 : 0;
            bg.setDepth(depth);

            const sheep = this.add.image(px, py, 'sheep').setDisplaySize(sheepW, sheepH).setDepth(depth);

            // Gentle floating animation
            this.tweens.add({
                targets: [bg, sheep],
                y: `+=${3 + Math.random() * 3}`,
                duration: 1200 + Math.random() * 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 800,
            });
        }

        // Wolf in center (on top of sheep)
        const wolfSrc = this.textures.get('wolf').getSourceImage();
        const wolfH = height * 0.18;
        const wolfScale = wolfH / wolfSrc.height;
        const wolfW = wolfSrc.width * wolfScale;
        this.add.image(width / 2, centerY, 'wolf').setDisplaySize(wolfW, wolfH).setDepth(10);

        // Buttons

        // Tutorial button
        this._createButton(width / 2, btnStartY, btnW, btnH, '튜토리얼', 0x27ae60, () => {
            this.scene.start('GameScene', { level: 0 });
        });

        // New game button
        this._createButton(width / 2, btnStartY + btnH + btnGap, btnW, btnH, '새로하기', 0x3498db, () => {
            this.scene.start('GameScene', { level: CONFIG.TUTORIAL_COUNT });
        });

        // Continue button
        const pack = localStorage.getItem('paintSheep_stagePack') || 'NoMaxStages';
        const progressKey = `paintSheep_progress_${pack}`;
        const savedStage = parseInt(localStorage.getItem(progressKey)) || 0;
        const hasSave = savedStage > 0;
        const continueAlpha = hasSave ? 1 : 0.4;
        this._createButton(width / 2, btnStartY + (btnH + btnGap) * 2, btnW, btnH,
            hasSave ? `이어하기 (Stage ${savedStage})` : '이어하기', 0x8e44ad, () => {
            if (!hasSave) return;
            const level = savedStage + CONFIG.TUTORIAL_COUNT - 1;
            this.scene.start('GameScene', { level });
        }, continueAlpha, !hasSave);

        // Settings button (gear icon top-right)
        this.add.text(width - 40, 30, '⚙️', {
            fontSize: '24px'
        }).setOrigin(0.5).setInteractive()
          .on('pointerdown', () => this._showSettings());
    }

    _showSettings() {
        if (this.settingsPanel) return;

        const { width, height } = this.scale;
        const panelW = width * 0.88;
        const panelX = (width - panelW) / 2;

        this.settingsPanel = this.add.container(0, 0).setDepth(100);

        // Dim background
        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.5);
        dim.fillRect(-100, -100, width + 200, height + 200);
        dim.setInteractive(new Phaser.Geom.Rectangle(-100, -100, width + 200, height + 200), Phaser.Geom.Rectangle.Contains);
        this.settingsPanel.add(dim);

        // Calculate layout dimensions first
        const cardW = panelW * 0.38;
        const gap = panelW * 0.05;
        const blockSizeCalc = Math.min(cardW * 0.35, 36);
        const colorCardH = 15 + blockSizeCalc * 4 + 6 * 3 + 16 + 15;
        const cbCardH = 15 + blockSizeCalc * 3 + 6 * 2 + 16 + 15;

        // Compute total panel height
        const topPadding = 30;
        const sectionGap = 24;
        let contentH = topPadding + 24; // title
        contentH += 10 + colorCardH; // color mode cards
        contentH += sectionGap + 24 + 10 + cbCardH; // cb section
        contentH += sectionGap + 24 + 10 + 36; // pack section
        contentH += 20 + 36 + 20; // close button + bottom padding
        const panelH = contentH;
        const panelY = (height - panelH) / 2;

        // Panel background
        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.97);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
        this.settingsPanel.add(panel);

        // --- Color mode section ---
        let cy = panelY + topPadding;
        const title = this.add.text(width / 2, cy, '색상 표시 방법', {
            fontSize: '20px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(title);

        const currentMode = localStorage.getItem('paintSheep_colorMode') || 'mixed';
        const leftX = width / 2 - cardW - gap / 2;
        const rightX = width / 2 + gap / 2;

        cy += 34;
        this._drawOptionCard(leftX, cy, cardW, null, 'mixed', '색 혼합', currentMode === 'mixed');
        this._drawOptionCard(rightX, cy, cardW, null, 'diagonal', '대각선 분할', currentMode === 'diagonal');
        cy += colorCardH;

        // --- Color blind section ---
        cy += sectionGap;
        const cbMode = localStorage.getItem('paintSheep_colorBlind') === 'true';
        const cbTitle = this.add.text(width / 2, cy, '색약 모드', {
            fontSize: '20px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(cbTitle);

        cy += 30;
        this._drawCbCard(leftX, cy, cardW, 'off', cbMode === false, currentMode);
        this._drawCbCard(rightX, cy, cardW, 'on', cbMode === true, currentMode);
        cy += cbCardH;

        // --- Stage pack section ---
        cy += sectionGap;
        const currentPack = localStorage.getItem('paintSheep_stagePack') || 'NoMaxStages';
        const packTitle = this.add.text(width / 2, cy, '스테이지 팩', {
            fontSize: '20px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(packTitle);

        const packs = [
            { key: 'NoMaxStages', label: '기본' },
            { key: 'BlackStages', label: 'Black' },
            { key: 'MegaStages', label: 'Mega' },
        ];
        const packBtnW = (panelW - gap * 4) / 3;
        cy += 30;
        const packStartX = panelX + gap;

        for (let i = 0; i < packs.length; i++) {
            const bx = packStartX + i * (packBtnW + gap);
            const isSelected = currentPack === packs[i].key;
            const btnGfx = this.add.graphics();
            btnGfx.fillStyle(isSelected ? 0x4CAF50 : 0xe0e0e0, 1);
            btnGfx.fillRoundedRect(bx, cy, packBtnW, 36, 8);
            this.settingsPanel.add(btnGfx);

            const btnText = this.add.text(bx + packBtnW / 2, cy + 18, packs[i].label, {
                fontSize: '14px', color: isSelected ? '#fff' : '#333', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.settingsPanel.add(btnText);

            const btnZone = this.add.zone(bx + packBtnW / 2, cy + 18, packBtnW, 36).setInteractive();
            btnZone.on('pointerdown', () => {
                localStorage.setItem('paintSheep_stagePack', packs[i].key);
                this.settingsPanel.destroy(true);
                this.settingsPanel = null;
                this._showSettings();
            });
            this.settingsPanel.add(btnZone);
        }
        cy += 36;

        // Close button
        cy += 20;
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0x999999, 1);
        closeBg.fillRoundedRect(width / 2 - 50, cy, 100, 36, 8);
        this.settingsPanel.add(closeBg);
        const closeText = this.add.text(width / 2, cy + 18, '닫기', {
            fontSize: '16px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(closeText);
        const closeZone = this.add.zone(width / 2, cy + 18, 100, 36).setInteractive();
        closeZone.on('pointerdown', () => {
            this.settingsPanel.destroy(true);
            this.settingsPanel = null;
            this.scene.restart();
        });
        this.settingsPanel.add(closeZone);
    }

    _drawToggle(x, cy, w, h, isOn, callback) {
        const gfx = this.add.graphics();
        gfx.fillStyle(isOn ? 0x27ae60 : 0xcccccc, 1);
        gfx.fillRoundedRect(x, cy - h / 2, w, h, h / 2);
        gfx.fillStyle(0xffffff, 1);
        const knobX = isOn ? x + w - h / 2 - 2 : x + h / 2 + 2;
        gfx.fillCircle(knobX, cy, h / 2 - 3);
        this.settingsPanel.add(gfx);

        const zone = this.add.zone(x + w / 2, cy, w, h).setInteractive();
        zone.on('pointerdown', callback);
        this.settingsPanel.add(zone);
    }

    _drawCbCard(x, y, w, mode, selected, colorMode) {
        const topPad = 15;
        const blockSize = Math.min(w * 0.35, 36);
        const previewGap = blockSize + 6;
        const previewBottom = topPad + blockSize * 3 + 6 * 2;
        const labelH = 16;
        const cardH = previewBottom + labelH + topPad;

        const card = this.add.graphics();
        card.fillStyle(selected ? 0xE3F2FD : 0xf5f5f5, 1);
        card.fillRoundedRect(x, y, w, cardH, 12);
        card.lineStyle(3, selected ? 0x2979FF : 0xcccccc, 1);
        card.strokeRoundedRect(x, y, w, cardH, 12);
        this.settingsPanel.add(card);

        const previewCx = x + w / 2;
        const previewStartY = y + topPad;
        const isOn = mode === 'on';

        const examples = [
            { colors: [0xE53935], mixed: 0xE53935, keys: ['RED'] },
            { colors: [0xE53935, 0xFFD600], mixed: 0xFF9100, keys: ['RED', 'YELLOW'] },
            { colors: [0xE53935, 0xFFD600, 0x2979FF], mixed: 0x212121, keys: ['RED', 'YELLOW', 'BLUE'] },
        ];

        for (let i = 0; i < examples.length; i++) {
            const cy = previewStartY + blockSize / 2 + previewGap * i;
            const ex = examples[i];
            const half = blockSize / 2;

            const gfx = this.add.graphics();
            if (ex.colors.length === 1 || colorMode === 'mixed') {
                const c = ex.colors.length === 1 ? ex.colors[0] : ex.mixed;
                gfx.fillStyle(c, 1);
                gfx.fillRoundedRect(previewCx - half, cy - half, blockSize, blockSize, 6);
            } else if (ex.colors.length === 2) {
                gfx.fillStyle(ex.colors[0], 1);
                gfx.fillRoundedRect(previewCx - half, cy - half, blockSize, blockSize, 6);
                gfx.fillStyle(ex.colors[0], 1);
                gfx.fillTriangle(previewCx - half, cy - half, previewCx + half, cy - half, previewCx - half, cy + half);
                gfx.fillStyle(ex.colors[1], 1);
                gfx.fillTriangle(previewCx + half, cy - half, previewCx + half, cy + half, previewCx - half, cy + half);
            } else {
                const t = half * 0.45;
                gfx.fillStyle(ex.colors[0], 1);
                gfx.fillRoundedRect(previewCx - half, cy - half, blockSize, blockSize, 6);
                gfx.fillStyle(ex.colors[0], 1);
                gfx.beginPath();
                gfx.moveTo(previewCx - half, cy - half);
                gfx.lineTo(previewCx + t, cy - half);
                gfx.lineTo(previewCx - half, cy + t);
                gfx.closePath();
                gfx.fillPath();
                gfx.fillStyle(ex.colors[1], 1);
                gfx.beginPath();
                gfx.moveTo(previewCx + t, cy - half);
                gfx.lineTo(previewCx + half, cy - half);
                gfx.lineTo(previewCx + half, cy - t);
                gfx.lineTo(previewCx - t, cy + half);
                gfx.lineTo(previewCx - half, cy + half);
                gfx.lineTo(previewCx - half, cy + t);
                gfx.closePath();
                gfx.fillPath();
                gfx.fillStyle(ex.colors[2], 1);
                gfx.beginPath();
                gfx.moveTo(previewCx + half, cy - t);
                gfx.lineTo(previewCx + half, cy + half);
                gfx.lineTo(previewCx - t, cy + half);
                gfx.closePath();
                gfx.fillPath();
            }

            // Rounded mask
            const mask = this.make.graphics();
            mask.fillStyle(0xffffff);
            mask.fillRoundedRect(previewCx - half, cy - half, blockSize, blockSize, 6);
            gfx.setMask(mask.createGeometryMask());

            if (isOn) {
                const iconKey = ['RED', 'ORANGE', 'BLACK'][i];
                this._drawCbIcon(gfx, previewCx, cy, blockSize, iconKey);
            }
            this.settingsPanel.add(gfx);
        }

        const labelY = y + previewBottom + labelH / 2 + 4;
        const label = mode === 'off' ? 'OFF' : 'ON';
        const labelText = this.add.text(x + w / 2, labelY, label, {
            fontSize: '13px', color: selected ? '#1565C0' : '#666', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(labelText);

        const zone = this.add.zone(x + w / 2, y + cardH / 2, w, cardH).setInteractive();
        zone.on('pointerdown', () => {
            localStorage.setItem('paintSheep_colorBlind', mode === 'on' ? 'true' : 'false');
            this.settingsPanel.destroy(true);
            this.settingsPanel = null;
            this._showSettings();
        });
        this.settingsPanel.add(zone);
    }

    _drawCbIcon(graphics, cx, cy, blockSize, colorKey) {
        const components = {
            RED: ['RED'],
            ORANGE: ['RED', 'YELLOW'],
            BLACK: ['RED', 'YELLOW', 'BLUE'],
        }[colorKey] || [];
        const iconSize = blockSize * 0.096;
        const margin = blockSize * 0.33;
        const posMap = [
            [{ x: -margin, y: -margin }],
            [{ x: -margin, y: -margin }, { x: margin, y: margin }],
            [{ x: -margin, y: -margin }, { x: margin, y: -margin }, { x: margin, y: margin }],
        ];
        const positions = posMap[components.length - 1] || [];
        graphics.lineStyle(2, 0xffffff, 0.85);
        for (let i = 0; i < components.length; i++) {
            const px = cx + positions[i].x;
            const py = cy + positions[i].y;
            const comp = components[i];
            if (comp === 'RED') {
                graphics.strokeCircle(px, py, iconSize);
            } else if (comp === 'YELLOW') {
                graphics.beginPath();
                graphics.moveTo(px, py - iconSize);
                graphics.lineTo(px + iconSize, py + iconSize * 0.7);
                graphics.lineTo(px - iconSize, py + iconSize * 0.7);
                graphics.closePath();
                graphics.strokePath();
            } else if (comp === 'BLUE') {
                const s = iconSize * 0.85;
                graphics.strokeRect(px - s, py - s, s * 2, s * 2);
            }
        }
    }

    _drawOptionCard(x, y, w, h, mode, label, selected) {
        const topPad = 15;
        const blockSize = Math.min(w * 0.35, 36);
        const previewGap = blockSize + 6;
        const previewBottom = topPad + blockSize * 4 + 6 * 3;
        const labelH = 16;
        const cardH = previewBottom + labelH + topPad;

        const card = this.add.graphics();
        card.fillStyle(selected ? 0xE3F2FD : 0xf5f5f5, 1);
        card.fillRoundedRect(x, y, w, cardH, 12);
        card.lineStyle(3, selected ? 0x2979FF : 0xcccccc, 1);
        card.strokeRoundedRect(x, y, w, cardH, 12);
        this.settingsPanel.add(card);

        // Preview examples
        const previewCx = x + w / 2;
        const previewStartY = y + topPad;

        this._drawColorPreview(previewCx, previewStartY + blockSize / 2, blockSize, mode, [0xE53935, 0xFFD600], 0xFF9100);
        this._drawColorPreview(previewCx, previewStartY + blockSize / 2 + previewGap, blockSize, mode, [0xE53935, 0x2979FF], 0x6A1B9A);
        this._drawColorPreview(previewCx, previewStartY + blockSize / 2 + previewGap * 2, blockSize, mode, [0xFFD600, 0x2979FF], 0x00C853);
        this._drawColorPreview(previewCx, previewStartY + blockSize / 2 + previewGap * 3, blockSize, mode, [0xE53935, 0xFFD600, 0x2979FF], 0x212121);

        // Label below previews
        const labelY = y + previewBottom + labelH / 2 + 4;
        const labelText = this.add.text(x + w / 2, labelY, label, {
            fontSize: '13px', color: selected ? '#1565C0' : '#666', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(labelText);

        // Interactive zone
        const zone = this.add.zone(x + w / 2, y + cardH / 2, w, cardH).setInteractive();
        zone.on('pointerdown', () => {
            localStorage.setItem('paintSheep_colorMode', mode);
            this.settingsPanel.destroy(true);
            this.settingsPanel = null;
            this._showSettings();
        });
        this.settingsPanel.add(zone);
    }

    _drawColorPreview(cx, cy, size, mode, colors, mixedColor) {
        const gfx = this.add.graphics();
        const half = size / 2;

        if (mode === 'diagonal') {
            if (colors.length === 2) {
                gfx.fillStyle(colors[0], 1);
                gfx.fillRoundedRect(cx - half, cy - half, size, size, 6);
                gfx.fillStyle(colors[0], 1);
                gfx.fillTriangle(cx - half, cy - half, cx + half, cy - half, cx - half, cy + half);
                gfx.fillStyle(colors[1], 1);
                gfx.fillTriangle(cx + half, cy - half, cx + half, cy + half, cx - half, cy + half);
            } else {
                const t = half * 0.45;
                gfx.fillStyle(colors[0], 1);
                gfx.fillRoundedRect(cx - half, cy - half, size, size, 6);
                gfx.fillStyle(colors[0], 1);
                gfx.beginPath();
                gfx.moveTo(cx - half, cy - half);
                gfx.lineTo(cx + t, cy - half);
                gfx.lineTo(cx - half, cy + t);
                gfx.closePath();
                gfx.fillPath();
                gfx.fillStyle(colors[1], 1);
                gfx.beginPath();
                gfx.moveTo(cx + t, cy - half);
                gfx.lineTo(cx + half, cy - half);
                gfx.lineTo(cx + half, cy - t);
                gfx.lineTo(cx - t, cy + half);
                gfx.lineTo(cx - half, cy + half);
                gfx.lineTo(cx - half, cy + t);
                gfx.closePath();
                gfx.fillPath();
                gfx.fillStyle(colors[2], 1);
                gfx.beginPath();
                gfx.moveTo(cx + half, cy - t);
                gfx.lineTo(cx + half, cy + half);
                gfx.lineTo(cx - t, cy + half);
                gfx.closePath();
                gfx.fillPath();
            }
        } else {
            // Mixed: single solid color
            gfx.fillStyle(mixedColor, 1);
            gfx.fillRoundedRect(cx - half, cy - half, size, size, 6);
        }

        // Rounded mask
        const mask = this.make.graphics();
        mask.fillStyle(0xffffff);
        mask.fillRoundedRect(cx - half, cy - half, size, size, 6);
        gfx.setMask(mask.createGeometryMask());

        this.settingsPanel.add(gfx);
    }

    _createButton(cx, cy, w, h, label, color, callback, alpha = 1, disabled = false) {
        const bg = this.add.graphics();
        bg.fillStyle(color, alpha);
        bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);

        const text = this.add.text(cx, cy, label, {
            fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(alpha);

        if (!disabled) {
            const zone = this.add.zone(cx, cy, w, h).setInteractive();
            zone.on('pointerdown', callback);
        }
    }
}
