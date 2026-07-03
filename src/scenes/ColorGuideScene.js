import { CONFIG } from '../config.js';

export class ColorGuideScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ColorGuideScene' });
    }

    init(data) {
        this.returnLevel = data.level || 0;
        this.returnPuzzle = data.puzzle || null;
    }

    create() {
        const { width, height } = this.scale;

        this.add.graphics()
            .fillStyle(0xf5e6d3, 1)
            .fillRect(-2, -2, width + 4, height + 4);

        // Header
        this.add.text(width / 2, 30, '색상 혼합표', {
            fontSize: '22px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back button
        this.add.text(15, 25, '← 돌아가기', {
            fontSize: '16px', color: '#1565C0', fontFamily: 'Jua'
        }).setInteractive()
          .on('pointerdown', () => {
              if (this.returnPuzzle) {
                  this.scene.start('GameScene', { level: this.returnLevel, retryPuzzle: this.returnPuzzle, resume: true });
              } else {
                  this.scene.start('GameScene', { level: this.returnLevel });
              }
          });

        const startY = 70;
        const rowH = (height - startY - 20) / 8; // 3 primary + 1 divider + 3 mixed + 1 triple
        const circleR = Math.min(rowH * 0.3, 20);
        const leftX = 50;
        const centerX = width / 2;
        const rightX = width - 50;

        // Section: Primary colors
        this.add.text(width / 2, startY, '기본색 (팔레트)', {
            fontSize: '16px', color: '#555', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        const primaries = [
            { name: '빨강', key: 'RED' },
            { name: '노랑', key: 'YELLOW' },
            { name: '파랑', key: 'BLUE' },
        ];

        let y = startY + 35;
        for (const p of primaries) {
            const hex = CONFIG.DISPLAY_COLORS[p.key];
            const num = parseInt(hex.replace('#', ''), 16);
            const g = this.add.graphics();
            g.fillStyle(num, 1);
            g.fillCircle(leftX, y, circleR);
            g.lineStyle(2, 0xcccccc, 1);
            g.strokeCircle(leftX, y, circleR);
            this.add.text(leftX + circleR + 12, y, p.name, {
                fontSize: '15px', color: '#333', fontFamily: 'Jua'
            }).setOrigin(0, 0.5);
            y += rowH * 0.7;
        }

        // Divider
        const dividerY = y + 5;
        const divG = this.add.graphics();
        divG.lineStyle(1, 0xcccccc, 1);
        divG.lineBetween(20, dividerY, width - 20, dividerY);

        // Section: Mixed colors
        this.add.text(width / 2, dividerY + 15, '혼합색 (벽 색상)', {
            fontSize: '16px', color: '#555', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        const mixtures = [
            { name: '주황', key: 'ORANGE', components: ['RED', 'YELLOW'] },
            { name: '보라', key: 'PURPLE', components: ['RED', 'BLUE'] },
            { name: '초록', key: 'GREEN', components: ['YELLOW', 'BLUE'] },
            { name: '검정', key: 'BLACK', components: ['RED', 'YELLOW', 'BLUE'] },
        ];

        y = dividerY + 45;
        const smallR = circleR * 0.65;
        const plusGap = 16;
        const eqGap = 20;
        const circleGap = 8;

        for (const mix of mixtures) {
            // Result color circle
            const hex = CONFIG.DISPLAY_COLORS[mix.key];
            const num = parseInt(hex.replace('#', ''), 16);
            const g = this.add.graphics();
            g.fillStyle(num, 1);
            g.fillCircle(leftX, y, circleR);
            g.lineStyle(2, 0xcccccc, 1);
            g.strokeCircle(leftX, y, circleR);

            // Result name
            this.add.text(leftX + circleR + 12, y, mix.name, {
                fontSize: '15px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            // Calculate total formula width for centering
            const nComp = mix.components.length;
            const formulaW = nComp * (smallR * 2) + (nComp - 1) * (plusGap + circleGap) + eqGap + smallR * 2;
            const formulaLeft = width / 2 - formulaW / 2 + (width * 0.1);

            // Formula: component circles with + signs
            let fx = formulaLeft + smallR;
            for (let i = 0; i < nComp; i++) {
                if (i > 0) {
                    this.add.text(fx - smallR - plusGap / 2, y, '+', {
                        fontSize: '14px', color: '#666', fontFamily: 'Jua'
                    }).setOrigin(0.5);
                }
                const compHex = CONFIG.DISPLAY_COLORS[mix.components[i]];
                const compNum = parseInt(compHex.replace('#', ''), 16);
                const cg = this.add.graphics();
                cg.fillStyle(compNum, 1);
                cg.fillCircle(fx, y, smallR);
                cg.lineStyle(1.5, 0xaaaaaa, 1);
                cg.strokeCircle(fx, y, smallR);
                fx += smallR * 2 + plusGap + circleGap;
            }

            // = sign between last component and result
            fx -= plusGap + circleGap;
            fx += eqGap / 2;
            this.add.text(fx, y, '=', {
                fontSize: '14px', color: '#666', fontFamily: 'Jua'
            }).setOrigin(0.5);
            fx += eqGap / 2 + smallR;

            // Result circle
            const rg = this.add.graphics();
            rg.fillStyle(num, 1);
            rg.fillCircle(fx, y, smallR);
            rg.lineStyle(1.5, 0xaaaaaa, 1);
            rg.strokeCircle(fx, y, smallR);

            y += rowH * 0.85;
        }
    }
}
