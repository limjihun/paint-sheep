import { saveProgress, loadProgress, submitStageScore, submitMegaScore } from '../storage.js';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    preload() {
        const a = (window.__PAINTSHEEP_BASE || '') + 'assets/';
        this.load.image('wolf', a + 'wolf.png');
    }

    init(data) {
        this.cleared = data.cleared || false;
        this.remainingSheep = data.remainingSheep || 0;
        this.level = data.level || 0;
        this.retryPuzzle = data.retryPuzzle || null;
        this.isTutorial = data.isTutorial || false;
        this.isMegaStage = data.isMegaStage || false;
        this.megaStageNum = data.megaStageNum || 0;
        this.megaScore = data.megaScore || 0;
        this.megaMovesUsed = data.megaMovesUsed || 0;
        this.megaMovesLeft = data.megaMovesLeft || 0;
    }

    async create() {
        await document.fonts.ready;
        this.add.text(-100, -100, 'X', { fontFamily: 'Jua' }).destroy();
        const { width, height } = this.scale;

        this.input.enabled = false;
        this.time.delayedCall(300, () => { this.input.enabled = true; });

        this.add.graphics()
            .fillStyle(0x000000, 0.6)
            .fillRect(-2, -2, width + 4, height + 4);

        const panelW = width * 0.8;
        const panelH = height * 0.50;
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        this.add.graphics()
            .fillStyle(0xffffff, 0.95)
            .fillRoundedRect(panelX, panelY, panelW, panelH, 16);

        if (this.isMegaStage) {
            if (this.cleared) {
                this.add.text(width / 2, panelY + 40, '잘했어요!', {
                    fontSize: '28px', color: '#27ae60', fontFamily: 'Jua', fontStyle: 'bold'
                }).setOrigin(0.5);
            } else {
                this.add.text(width / 2, panelY + 40, '아쉬워요!', {
                    fontSize: '28px', color: '#e67e22', fontFamily: 'Jua', fontStyle: 'bold'
                }).setOrigin(0.5);
            }

            this.add.text(width / 2, panelY + 85, '최종 점수', {
                fontSize: '16px', color: '#555', fontFamily: 'Jua'
            }).setOrigin(0.5);

            this.add.text(width / 2, panelY + 120, `${this.megaScore}`, {
                fontSize: '36px', color: '#e67e22', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(width / 2, panelY + 160, `사용한 턴: ${this.megaMovesUsed}  |  남은 턴: ${this.megaMovesLeft}`, {
                fontSize: '15px', color: '#777', fontFamily: 'Jua'
            }).setOrigin(0.5);
        } else if (this.cleared) {
            this.add.text(width / 2, panelY + 40, '최고에요!', {
                fontSize: '28px', color: '#27ae60', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(width / 2, panelY + 78, '완벽하게 모든 양을 구했어요.', {
                fontSize: '16px', color: '#555', fontFamily: 'Jua'
            }).setOrigin(0.5);

            const wolfSrc = this.textures.get('wolf').getSourceImage();
            const wolfH = panelH * 0.25;
            const wolfScale = wolfH / wolfSrc.height;
            const wolfW = wolfSrc.width * wolfScale;
            this.add.image(width / 2, panelY + panelH * 0.42, 'wolf').setDisplaySize(wolfW, wolfH);
        } else {
            this.add.text(width / 2, panelY + 40, '아쉬워요!', {
                fontSize: '28px', color: '#e67e22', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(width / 2, panelY + 78, `늑대가 ${this.remainingSheep}마리 양을 잡아먹었어요`, {
                fontSize: '16px', color: '#555', fontFamily: 'Jua'
            }).setOrigin(0.5);

            const wolfSrc = this.textures.get('wolf').getSourceImage();
            const wolfH = panelH * 0.25;
            const wolfScale = wolfH / wolfSrc.height;
            const wolfW = wolfSrc.width * wolfScale;
            this.add.image(width / 2, panelY + panelH * 0.42, 'wolf').setDisplaySize(wolfW, wolfH);
        }

        // Buttons
        const btnW = panelW * 0.7;
        const btnH = 44;
        const btnX = width / 2 - btnW / 2;
        const btnGap = 12;
        let btnY = panelY + panelH - 170;

        if (this.isMegaStage) {
            // Submit mega score
            if (this.megaStageNum > 0) {
                submitMegaScore(this.megaStageNum, this.megaScore);
            }

            // Retry
            this.add.graphics()
                .fillStyle(0x3498db, 1)
                .fillRoundedRect(btnX, btnY, btnW, btnH, 10);
            this.add.text(width / 2, btnY + btnH / 2, 'RETRY', {
                fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
                .setInteractive()
                .on('pointerdown', () => this.scene.start('GameScene', {
                    megaMode: true, megaStageNum: this.megaStageNum
                }));

            btnY += btnH + btnGap;

            // Home
            this.add.graphics()
                .fillStyle(0x27ae60, 1)
                .fillRoundedRect(btnX, btnY, btnW, btnH, 10);
            this.add.text(width / 2, btnY + btnH / 2, 'HOME', {
                fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
                .setInteractive()
                .on('pointerdown', () => this.scene.start('EventScene'));
        } else if (this.isTutorial) {
            btnY = panelY + panelH - 70;
            this.add.graphics()
                .fillStyle(0x27ae60, 1)
                .fillRoundedRect(btnX, btnY, btnW, btnH, 10);
            this.add.text(width / 2, btnY + btnH / 2, 'NEXT', {
                fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
                .setInteractive()
                .on('pointerdown', () => {
                    const nextStage = this.level + 2;
                    const isPerfect = this.cleared && this.remainingSheep === 0;
                    loadProgress().then(prev => {
                        const perfectCount = ((prev && prev.perfectCount) || 0) + (isPerfect ? 1 : 0);
                        saveProgress({ stage: nextStage, perfectCount });
                        submitStageScore(nextStage - 1, perfectCount);
                    });
                    this.scene.start('GameScene', { level: this.level + 1 });
                });
        } else {
            // Retry button
            this.add.graphics()
                .fillStyle(0x3498db, 1)
                .fillRoundedRect(btnX, btnY, btnW, btnH, 10);
            this.add.text(width / 2, btnY + btnH / 2, 'RETRY', {
                fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
                .setInteractive()
                .on('pointerdown', () => this.scene.start('GameScene', { level: this.level, retryPuzzle: this.retryPuzzle }));

            btnY += btnH + btnGap;

            // Next button
            this.add.graphics()
                .fillStyle(0x27ae60, 1)
                .fillRoundedRect(btnX, btnY, btnW, btnH, 10);
            this.add.text(width / 2, btnY + btnH / 2, 'NEXT', {
                fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
                .setInteractive()
                .on('pointerdown', () => {
                    const nextStage = this.level + 2;
                    const isPerfect = this.cleared && this.remainingSheep === 0;
                    loadProgress().then(prev => {
                        const perfectCount = ((prev && prev.perfectCount) || 0) + (isPerfect ? 1 : 0);
                        saveProgress({ stage: nextStage, perfectCount });
                        submitStageScore(nextStage - 1, perfectCount);
                    });
                    this.scene.start('GameScene', { level: this.level + 1 });
                });

            if (!this.isMegaStage) {
                btnY += btnH + btnGap;

                // Solution button
                this.add.graphics()
                    .fillStyle(0x8e44ad, 1)
                    .fillRoundedRect(btnX, btnY, btnW, btnH, 10);
                this.add.text(width / 2, btnY + btnH / 2, '📺 SOLUTION', {
                    fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
                }).setOrigin(0.5);
                this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
                    .setInteractive()
                    .on('pointerdown', () => this.scene.start('SolutionScene', {
                        puzzle: this.retryPuzzle,
                        level: this.level,
                        fromGameOver: true,
                        cleared: this.cleared,
                        remainingSheep: this.remainingSheep
                    }));
            }
        }
    }

}
