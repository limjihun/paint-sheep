import { CONFIG } from '../config.js';
import { loadProgress, saveProgress, resetScore } from '../storage.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        const a = (window.__PAINTSHEEP_BASE || '') + 'assets/';
        this.load.image('title', a + 'title.png');
        this.load.image('wolf', a + 'wolf.png');
        this.load.image('sheep', a + 'sheep.png');
        this.load.image('sunglasses', a + 'sunglasses.png');
    }

    async create() {
        await document.fonts.ready;
        this.add.text(-100, -100, 'X', { fontFamily: 'Jua' }).destroy();
        const { width, height } = this.scale;

        // Background
        this.add.graphics()
            .fillStyle(0xf5e6d3, 1)
            .fillRect(-2, -2, width + 4, height + 4);

        const tabH = 60;
        const headerH = 50;

        // --- Top header (profile, coins, hearts, settings) ---
        this._createHeader(width, headerH);

        // --- Center area (title + sheep/wolf + start button) ---
        const centerTop = headerH + 10;
        const centerBottom = height - tabH - 10;
        const centerH = centerBottom - centerTop;

        // Title
        const titleY = centerTop + centerH * 0.08;
        const titleSrc = this.textures.get('title').getSourceImage();
        const titleMaxW = width * 1.0;
        const titleScale = titleMaxW / titleSrc.width;
        const titleW = titleSrc.width * titleScale;
        const titleH = titleSrc.height * titleScale;
        this.add.image(width / 2, titleY, 'title').setDisplaySize(titleW, titleH);

        // Sheep + Wolf display area
        const displayCenterY = centerTop + centerH * 0.50;
        this._createSheepDisplay(width, displayCenterY);

        // --- Bottom tab bar (show immediately) ---
        this._createTabBar(width, height, tabH);

        // Start button area - show loading text first
        const btnY = centerTop + centerH * 0.92;
        const btnW = width * 0.55;
        const btnH = 52;

        const loadingText = this.add.text(width / 2, btnY, '불러오는 중...', {
            fontSize: '18px', color: '#888', fontFamily: 'Jua'
        }).setOrigin(0.5);

        // Load progress then show button
        loadProgress().then(progress => {
            const savedStage = progress?.stage || 1;
            loadingText.destroy();

            const btnGfx = this.add.graphics();
            btnGfx.fillStyle(0x4CAF50, 1);
            btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 26);
            btnGfx.lineStyle(3, 0x388E3C, 1);
            btnGfx.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 26);

            this.add.text(width / 2, btnY, `Level ${savedStage}`, {
                fontSize: '24px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.zone(width / 2, btnY, btnW, btnH)
                .setInteractive()
                .on('pointerdown', () => {
                    const level = savedStage + CONFIG.TUTORIAL_COUNT - 1;
                    this.scene.start('GameScene', { level });
                });
        });
    }

    _createHeader(width, headerH) {
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0xf5e6d3, 1);
        headerBg.fillRect(0, 0, width, headerH);

        // Profile icon (dummy)
        const profSize = 36;
        const profX = 12 + profSize / 2;
        const profY = headerH / 2;
        const profGfx = this.add.graphics();
        profGfx.fillStyle(0xff8a65, 1);
        profGfx.fillRoundedRect(profX - profSize / 2, profY - profSize / 2, profSize, profSize, 8);
        this.add.text(profX, profY, '🐑', { fontSize: '20px' }).setOrigin(0.5);

        // Coins (dummy)
        const coinX = profX + profSize / 2 + 16;
        this.add.graphics().fillStyle(0xFFC107, 1).fillCircle(coinX, profY, 10);
        this.add.text(coinX + 14, profY, '1,000', {
            fontSize: '12px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        // Hearts (dummy)
        const heartX = coinX + 80;
        this.add.text(heartX, profY, '❤️ 5', {
            fontSize: '13px', color: '#e91e63', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        // Settings gear
        const gearX = width - 30;
        this.add.text(gearX, profY, '⚙️', {
            fontSize: '22px'
        }).setOrigin(0.5).setInteractive()
          .on('pointerdown', () => this._showSettings());
    }

    _createSheepDisplay(width, centerY) {
        this._displayWidth = width;
        this._displayCenterY = centerY;
        this._sheepBlocks = [];

        const blockDefs = [
            { colors: [0xE53935], mixed: 0xE53935, components: 1 },
            { colors: [0xFFD600], mixed: 0xFFD600, components: 1 },
            { colors: [0x2979FF], mixed: 0x2979FF, components: 1 },
            { colors: [0xE53935, 0xFFD600], mixed: 0xFF9100, components: 2 },
            { colors: [0xE53935, 0x2979FF], mixed: 0x6A1B9A, components: 2 },
            { colors: [0xFFD600, 0x2979FF], mixed: 0x00C853, components: 2 },
            { colors: 'rainbow', mixed: null, components: 1 },
            { colors: [0xE53935, 0xFFD600, 0x2979FF], mixed: 0x212121, components: 3 },
        ];
        const positions = [
            { x: -1.3, y: -1.2 }, { x: 0, y: -1.4 }, { x: 1.3, y: -1.2 },
            { x: -1.6, y: 0.1 }, { x: 1.6, y: 0.1 },
            { x: -1.3, y: 1.2 }, { x: 0, y: 1.4 }, { x: 1.3, y: 1.2 },
        ];

        this._blockDefs = blockDefs;
        this._positions = positions;
        this._spawnAllSheep();

        // Wolf in center
        const wolfSrc = this.textures.get('wolf').getSourceImage();
        const wolfH = width * 0.3;
        const wolfScale = wolfH / wolfSrc.height;
        const wolfW = wolfSrc.width * wolfScale;
        this.add.image(width / 2, centerY, 'wolf').setDisplaySize(wolfW, wolfH).setDepth(10);

        // Start paint cycle
        this._paintTimer = this.time.addEvent({
            delay: 2000,
            callback: () => this._paintRandomSheep(),
            loop: true
        });
    }

    _spawnAllSheep() {
        const width = this._displayWidth;
        const centerY = this._displayCenterY;
        const sheepSrc = this.textures.get('sheep').getSourceImage();
        const blockSize = width * 0.144;
        const sheepH = blockSize * 0.75;
        const sheepScale = sheepH / sheepSrc.height;
        const sheepW = sheepSrc.width * sheepScale;
        const maxPosX = 1.6;
        const spreadX = (width * 0.9 / 2 - blockSize / 2) / (maxPosX * blockSize);
        const half = blockSize / 2;

        for (let i = 0; i < this._positions.length; i++) {
            const px = width / 2 + this._positions[i].x * blockSize * spreadX;
            const py = centerY + this._positions[i].y * blockSize * spreadX;
            const def = this._blockDefs[i];
            const colorArr = def.colors;

            const container = this.add.container(px, py);
            const depth = i >= 5 ? 20 : 0;
            container.setDepth(depth);

            const bg = this.make.graphics({}, false);
            if (colorArr === 'rainbow') {
                const r = 8;
                const rainbowColors = [0x00BCD4, 0xE91E63, 0xFFEB3B, 0x2979FF, 0x00C853, 0xE53935];
                const stripeH = blockSize / rainbowColors.length;
                for (let s = 0; s < rainbowColors.length; s++) {
                    bg.fillStyle(rainbowColors[s], 1);
                    if (s === 0) {
                        bg.fillRoundedRect(-half, -half, blockSize, stripeH + r, { tl: r, tr: r, bl: 0, br: 0 });
                    } else if (s === rainbowColors.length - 1) {
                        bg.fillRoundedRect(-half, -half + s * stripeH - r, blockSize, stripeH + r, { tl: 0, tr: 0, bl: r, br: r });
                    } else {
                        bg.fillRect(-half, -half + s * stripeH, blockSize, stripeH);
                    }
                }
            } else {
                bg.fillStyle(def.mixed, 1);
                bg.fillRoundedRect(-half, -half, blockSize, blockSize, 8);
            }

            const sheep = this.make.image({ key: 'sheep', x: 0, y: 0 }, false);
            sheep.setDisplaySize(sheepW, sheepH).setOrigin(0.5);

            container.add([bg, sheep]);

            this.tweens.add({
                targets: container,
                y: `+=${3 + Math.random() * 3}`,
                duration: 1200 + Math.random() * 600,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
                delay: Math.random() * 800,
            });

            this._sheepBlocks.push({
                container, bg, sheep, px, py, half, blockSize,
                painted: 0, alive: true, def, depth, sheepW, sheepH
            });
        }
    }

    _paintRandomSheep() {
        const alive = this._sheepBlocks.filter(b => b.alive);
        if (alive.length === 0) {
            this.time.delayedCall(800, () => {
                this._spawnAllSheep();
            });
            return;
        }

        const target = alive[Math.floor(Math.random() * alive.length)];
        target.painted++;

        const colorArr = target.def.colors;
        if (colorArr === 'rainbow') {
            const c = [0xE53935, 0xFFD600, 0x2979FF][Math.floor(Math.random() * 3)];
            target.sheep.setTint(c);
        } else {
            const R = 0xE53935, Y = 0xFFD600, B = 0x2979FF;
            const mixMap = new Map([
                [JSON.stringify([R]), R],
                [JSON.stringify([Y]), Y],
                [JSON.stringify([B]), B],
                [JSON.stringify([R, Y].sort()), 0xFF9100],
                [JSON.stringify([R, B].sort()), 0x6A1B9A],
                [JSON.stringify([Y, B].sort()), 0x00C853],
                [JSON.stringify([R, Y, B].sort()), 0x212121],
            ]);
            const applied = colorArr.slice(0, target.painted).sort();
            const mixed = mixMap.get(JSON.stringify(applied));
            if (mixed !== undefined) {
                target.sheep.setTint(mixed);
            }
        }

        // Paint bounce (same as in-game: container scale)
        this.tweens.add({
            targets: target.container,
            scaleX: 1.1, scaleY: 1.1,
            duration: 100, yoyo: true
        });

        // Check if fully painted → clear
        const neededPaints = colorArr === 'rainbow' ? 1 : colorArr.length;
        if (target.painted >= neededPaints) {
            target.alive = false;

            // Add sunglasses before clear
            const sg = this.make.image({ key: 'sunglasses', x: 0, y: 0 }, false);
            sg.setDisplaySize(target.sheepW, target.sheepH).setOrigin(0.5);
            target.container.add(sg);

            // Clear animation (same as in-game: scale 0 + alpha 0)
            this.time.delayedCall(200, () => {
                this.tweens.add({
                    targets: target.container,
                    scaleX: 0, scaleY: 0, alpha: 0,
                    duration: 300,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        target.container.destroy();
                    }
                });
            });
        }
    }

    _createTabBar(width, height, tabH) {
        const tabY = height - tabH;

        const tabBg = this.add.graphics();
        tabBg.fillStyle(0x5d4037, 1);
        tabBg.fillRect(0, tabY, width, tabH);
        tabBg.fillStyle(0x6d4c41, 1);
        tabBg.fillRect(0, tabY, width, 2);

        const tabs = [
            { icon: '🏠', label: 'HOME', active: true },
            { icon: '🏆', label: 'RANK', action: () => this.scene.start('RankingScene') },
            { icon: '🎉', label: 'EVENT', action: () => this.scene.start('EventScene') },
        ];

        const tabW = width / tabs.length;
        for (let i = 0; i < tabs.length; i++) {
            const tx = tabW * i + tabW / 2;
            const ty = tabY + tabH / 2;
            const tab = tabs[i];

            if (tab.active) {
                const activeBg = this.add.graphics();
                activeBg.fillStyle(0x8d6e63, 1);
                activeBg.fillRoundedRect(tx - tabW / 2 + 4, tabY + 4, tabW - 8, tabH - 8, 8);
            }

            this.add.text(tx, ty - 8, tab.icon, {
                fontSize: '20px'
            }).setOrigin(0.5);

            if (tab.label) {
                this.add.text(tx, ty + 16, tab.label, {
                    fontSize: '10px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
                }).setOrigin(0.5);
            }

            if (tab.action) {
                this.add.zone(tx, tabY + tabH / 2, tabW, tabH)
                    .setInteractive()
                    .on('pointerdown', tab.action);
            }
        }
    }

    _showSettings() {
        if (this.settingsPanel) return;

        const { width, height } = this.scale;
        const panelW = width * 0.88;

        this.settingsPanel = this.add.container(0, 0).setDepth(100);

        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.5);
        dim.fillRect(-100, -100, width + 200, height + 200);
        dim.setInteractive(new Phaser.Geom.Rectangle(-100, -100, width + 200, height + 200), Phaser.Geom.Rectangle.Contains);
        this.settingsPanel.add(dim);

        const cardW = panelW * 0.38;
        const gap = panelW * 0.05;
        const blockSizeCalc = Math.min(cardW * 0.35, 36);
        const colorCardH = 15 + blockSizeCalc * 4 + 6 * 3 + 16 + 15;
        const cbCardH = 15 + blockSizeCalc * 3 + 6 * 2 + 16 + 15;

        const topPadding = 30;
        const sectionGap = 24;
        let contentH = topPadding + 24;
        contentH += 10 + colorCardH;
        contentH += sectionGap + 24 + 10 + cbCardH;
        contentH += sectionGap + 24 + 10 + 44; // new game section
        contentH += 20 + 36 + 20;
        const panelH = contentH;
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.97);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
        this.settingsPanel.add(panel);

        const leftX = width / 2 - cardW - gap / 2;
        const rightX = width / 2 + gap / 2;

        // --- Color mode ---
        let cy = panelY + topPadding;
        const title = this.add.text(width / 2, cy, '색상 표시 방법', {
            fontSize: '20px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(title);

        const currentMode = localStorage.getItem('paintSheep_colorMode') || 'mixed';
        cy += 34;
        this._drawOptionCard(leftX, cy, cardW, null, 'mixed', '색 혼합', currentMode === 'mixed');
        this._drawOptionCard(rightX, cy, cardW, null, 'diagonal', '대각선 분할', currentMode === 'diagonal');
        cy += colorCardH;

        // --- Color blind ---
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

        // --- Start from beginning ---
        cy += sectionGap;
        const newGameTitle = this.add.text(width / 2, cy, '처음부터', {
            fontSize: '20px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(newGameTitle);

        cy += 30;
        const newBtnW = panelW * 0.6;
        const newBtnGfx = this.add.graphics();
        newBtnGfx.fillStyle(0xe74c3c, 1);
        newBtnGfx.fillRoundedRect(width / 2 - newBtnW / 2, cy, newBtnW, 44, 10);
        this.settingsPanel.add(newBtnGfx);

        const newBtnText = this.add.text(width / 2, cy + 22, '진행 초기화 후 시작', {
            fontSize: '15px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(newBtnText);

        const newBtnZone = this.add.zone(width / 2, cy + 22, newBtnW, 44).setInteractive();
        newBtnZone.on('pointerdown', async () => {
            await saveProgress({ stage: 1, perfectCount: 0 });
            await resetScore();
            this.settingsPanel.destroy(true);
            this.settingsPanel = null;
            this.scene.start('GameScene', { level: CONFIG.TUTORIAL_COUNT });
        });
        this.settingsPanel.add(newBtnZone);
        cy += 44;

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
                gfx.beginPath(); gfx.moveTo(previewCx - half, cy - half); gfx.lineTo(previewCx + t, cy - half); gfx.lineTo(previewCx - half, cy + t); gfx.closePath(); gfx.fillPath();
                gfx.fillStyle(ex.colors[1], 1);
                gfx.beginPath(); gfx.moveTo(previewCx + t, cy - half); gfx.lineTo(previewCx + half, cy - half); gfx.lineTo(previewCx + half, cy - t); gfx.lineTo(previewCx - t, cy + half); gfx.lineTo(previewCx - half, cy + half); gfx.lineTo(previewCx - half, cy + t); gfx.closePath(); gfx.fillPath();
                gfx.fillStyle(ex.colors[2], 1);
                gfx.beginPath(); gfx.moveTo(previewCx + half, cy - t); gfx.lineTo(previewCx + half, cy + half); gfx.lineTo(previewCx - t, cy + half); gfx.closePath(); gfx.fillPath();
            }

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

        const previewCx = x + w / 2;
        const previewStartY = y + topPad;

        this._drawColorPreview(previewCx, previewStartY + blockSize / 2, blockSize, mode, [0xE53935, 0xFFD600], 0xFF9100);
        this._drawColorPreview(previewCx, previewStartY + blockSize / 2 + previewGap, blockSize, mode, [0xE53935, 0x2979FF], 0x6A1B9A);
        this._drawColorPreview(previewCx, previewStartY + blockSize / 2 + previewGap * 2, blockSize, mode, [0xFFD600, 0x2979FF], 0x00C853);
        this._drawColorPreview(previewCx, previewStartY + blockSize / 2 + previewGap * 3, blockSize, mode, [0xE53935, 0xFFD600, 0x2979FF], 0x212121);

        const labelY = y + previewBottom + labelH / 2 + 4;
        const labelText = this.add.text(x + w / 2, labelY, label, {
            fontSize: '13px', color: selected ? '#1565C0' : '#666', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.settingsPanel.add(labelText);

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
                gfx.beginPath(); gfx.moveTo(cx - half, cy - half); gfx.lineTo(cx + t, cy - half); gfx.lineTo(cx - half, cy + t); gfx.closePath(); gfx.fillPath();
                gfx.fillStyle(colors[1], 1);
                gfx.beginPath(); gfx.moveTo(cx + t, cy - half); gfx.lineTo(cx + half, cy - half); gfx.lineTo(cx + half, cy - t); gfx.lineTo(cx - t, cy + half); gfx.lineTo(cx - half, cy + half); gfx.lineTo(cx - half, cy + t); gfx.closePath(); gfx.fillPath();
                gfx.fillStyle(colors[2], 1);
                gfx.beginPath(); gfx.moveTo(cx + half, cy - t); gfx.lineTo(cx + half, cy + half); gfx.lineTo(cx - t, cy + half); gfx.closePath(); gfx.fillPath();
            }
        } else {
            gfx.fillStyle(mixedColor, 1);
            gfx.fillRoundedRect(cx - half, cy - half, size, size, 6);
        }

        const mask = this.make.graphics();
        mask.fillStyle(0xffffff);
        mask.fillRoundedRect(cx - half, cy - half, size, size, 6);
        gfx.setMask(mask.createGeometryMask());

        this.settingsPanel.add(gfx);
    }
}
