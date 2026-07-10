import { loadMegaScore } from '../storage.js';

export class MegaRankingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MegaRankingScene' });
    }

    init(data) {
        this.megaStageNum = data.megaStageNum || 1;
    }

    async create() {
        await document.fonts.ready;
        this.add.text(-100, -100, 'X', { fontFamily: 'Jua' }).destroy();
        const { width, height } = this.scale;

        this.add.graphics()
            .fillStyle(0xf5e6d3, 1)
            .fillRect(-2, -2, width + 4, height + 4);

        const headerH = 50;

        // Header
        this.add.graphics()
            .fillStyle(0x8e44ad, 1)
            .fillRect(0, 0, width, headerH);
        this.add.text(width / 2, headerH / 2, `Mega Stage ${this.megaStageNum} 기록`, {
            fontSize: '20px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back button
        this.add.text(16, headerH / 2, '← 뒤로', {
            fontSize: '14px', color: '#fff', fontFamily: 'Jua'
        }).setOrigin(0, 0.5);
        this.add.zone(50, headerH / 2, 80, headerH)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('EventScene'));

        const myScore = await loadMegaScore(this.megaStageNum);
        const centerY = height / 2;

        this.add.text(width / 2, centerY - 40, '내 최고 점수', {
            fontSize: '18px', color: '#777', fontFamily: 'Jua'
        }).setOrigin(0.5);

        if (myScore > 0) {
            this.add.text(width / 2, centerY + 10, `${myScore.toLocaleString()}`, {
                fontSize: '48px', color: '#e65100', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
        } else {
            this.add.text(width / 2, centerY + 10, '아직 기록이 없어요', {
                fontSize: '18px', color: '#999', fontFamily: 'Jua'
            }).setOrigin(0.5);
        }
    }
}
