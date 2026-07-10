import { loadMegaScore } from '../storage.js';

const MEGA_STAGE_COUNT = 10;

export class EventScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EventScene' });
    }

    async create() {
        await document.fonts.ready;
        this.add.text(-100, -100, 'X', { fontFamily: 'Jua' }).destroy();
        const { width, height } = this.scale;

        this.add.graphics()
            .fillStyle(0xf5e6d3, 1)
            .fillRect(-2, -2, width + 4, height + 4);

        const tabH = 60;
        const headerH = 50;

        // Header
        this.add.graphics()
            .fillStyle(0xe65100, 1)
            .fillRect(0, 0, width, headerH);
        this.add.text(width / 2, headerH / 2, 'Mega Sheep', {
            fontSize: '22px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Tab bar
        this._createTabBar(width, height, tabH);

        // Stage list
        const listTop = headerH + 10;
        const listBottom = height - tabH - 10;
        const rowH = 60;

        for (let i = 1; i <= MEGA_STAGE_COUNT; i++) {
            const y = listTop + (i - 1) * rowH;
            if (y + rowH > listBottom) break;
            this._createStageRow(i, 10, y, width - 20, rowH - 6);
        }
    }

    _createStageRow(stageNum, x, y, w, h) {
        const { width } = this.scale;

        // Background card
        const gfx = this.add.graphics();
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillRoundedRect(x, y, w, h, 8);
        gfx.lineStyle(1, 0xddccbb, 1);
        gfx.strokeRoundedRect(x, y, w, h, 8);

        // Stage name
        this.add.text(x + 14, y + h / 2, `Mega ${stageNum}`, {
            fontSize: '15px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        // Buttons (right side)
        const btnW = 50;
        const btnH = 30;
        const btnX = w - btnW - 4;
        const btnGfx = this.add.graphics();
        btnGfx.fillStyle(0x8e44ad, 1);
        btnGfx.fillRoundedRect(x + btnX, y + (h - btnH) / 2, btnW, btnH, 6);
        this.add.text(x + btnX + btnW / 2, y + h / 2, '기록', {
            fontSize: '12px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.zone(x + btnX + btnW / 2, y + h / 2, btnW, btnH)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('MegaRankingScene', { megaStageNum: stageNum }));

        const playBtnW = 50;
        const playBtnX = btnX - playBtnW - 8;
        const playGfx = this.add.graphics();
        playGfx.fillStyle(0x4CAF50, 1);
        playGfx.fillRoundedRect(x + playBtnX, y + (h - btnH) / 2, playBtnW, btnH, 6);
        this.add.text(x + playBtnX + playBtnW / 2, y + h / 2, 'PLAY', {
            fontSize: '12px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.zone(x + playBtnX + playBtnW / 2, y + h / 2, playBtnW, btnH)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('GameScene', {
                megaMode: true, megaStageNum: stageNum
            }));

        // Show local score
        const infoLeft = x + 90;
        const infoRight = x + playBtnX - 6;
        const infoCenterX = (infoLeft + infoRight) / 2;

        loadMegaScore(stageNum).then(myScore => {
            if (myScore > 0) {
                this.add.text(infoCenterX, y + h / 2, `${myScore.toLocaleString()}점`, {
                    fontSize: '13px', color: '#e65100', fontFamily: 'Jua', fontStyle: 'bold'
                }).setOrigin(0.5);
            } else {
                this.add.text(infoCenterX, y + h / 2, '-', {
                    fontSize: '13px', color: '#999', fontFamily: 'Jua'
                }).setOrigin(0.5);
            }
        });
    }

    _createTabBar(width, height, tabH) {
        const tabY = height - tabH;

        const tabBg = this.add.graphics();
        tabBg.fillStyle(0x5d4037, 1);
        tabBg.fillRect(0, tabY, width, tabH);
        tabBg.fillStyle(0x6d4c41, 1);
        tabBg.fillRect(0, tabY, width, 2);

        const tabs = [
            { icon: '🏠', label: 'HOME', action: () => this.scene.start('MainScene') },
            { icon: '🏆', label: 'RANK', action: () => this.scene.start('RankingScene') },
            { icon: '🎉', label: 'EVENT', active: true },
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
}
