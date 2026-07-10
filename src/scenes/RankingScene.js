import { loadProgress } from '../storage.js';

export class RankingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RankingScene' });
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
            .fillStyle(0x5d4037, 1)
            .fillRect(0, 0, width, headerH);
        this.add.text(width / 2, headerH / 2, '내 기록', {
            fontSize: '22px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Tab bar
        this._createTabBar(width, height, tabH);

        // My progress
        const myProgress = await loadProgress() || {};
        const bestStage = parseInt(localStorage.getItem('paintSheep_bestStage')) || (myProgress.stage ? myProgress.stage - 1 : 0);
        const perfectCount = parseInt(localStorage.getItem('paintSheep_perfectCount')) || myProgress.perfectCount || 0;

        const centerY = (headerH + height - tabH) / 2;

        this.add.text(width / 2, centerY - 60, '현재 스테이지', {
            fontSize: '16px', color: '#777', fontFamily: 'Jua'
        }).setOrigin(0.5);

        this.add.text(width / 2, centerY - 20, `${myProgress.stage || 1}`, {
            fontSize: '48px', color: '#2e7d32', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, centerY + 40, '퍼펙트 횟수', {
            fontSize: '16px', color: '#777', fontFamily: 'Jua'
        }).setOrigin(0.5);

        this.add.text(width / 2, centerY + 80, `${perfectCount}`, {
            fontSize: '48px', color: '#1565c0', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
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
            { icon: '🏆', label: 'RANK', active: true },
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
}
