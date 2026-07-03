import { CONFIG } from '../config.js';

export class MapEditorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapEditorScene' });
    }

    init(data) {
        this.returnLevel = data.level || 0;
        this.returnPuzzle = data.puzzle || null;
        this.editorRows = data.rows || 5;
        this.editorCols = data.cols || 5;
        this.stageNum = data.stageNum || 0;
    }

    create() {
        const { width, height } = this.scale;

        this.add.graphics()
            .fillStyle(0xf5e6d3, 1)
            .fillRect(-2, -2, width + 4, height + 4);

        // Header
        const title = this.stageNum > 0 ? `Stage ${this.stageNum} 에디터` : '맵 에디터';
        this.add.text(width / 2, 25, title, {
            fontSize: '20px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back button
        this.add.text(15, 20, '← 돌아가기', {
            fontSize: '14px', color: '#1565C0', fontFamily: 'Jua'
        }).setInteractive()
          .on('pointerdown', () => {
              if (this.returnPuzzle) {
                  this.scene.start('GameScene', { level: this.returnLevel, retryPuzzle: this.returnPuzzle, resume: true });
              } else {
                  this.scene.start('GameScene', { level: this.returnLevel });
              }
          });

        // Available colors
        this.colors = ['RED', 'YELLOW', 'BLUE', 'ORANGE', 'PURPLE', 'GREEN', 'BLACK', 'WHITE'];
        this.gimmicks = ['normal', 'dirty', 'rainbow', 'plank'];
        this.selectedColor = 'RED';
        this.selectedGimmick = 'normal';

        // Load grid from puzzle
        this.gridData = [];
        this.planks = [];
        if (this.returnPuzzle && this.returnPuzzle.initialGrid) {
            for (let r = 0; r < this.editorRows; r++) {
                const row = [];
                for (let c = 0; c < this.editorCols; c++) {
                    const cell = this.returnPuzzle.initialGrid[r][c];
                    row.push({
                        wallColor: cell.wallColor || 'RED',
                        type: cell.type || 'normal',
                    });
                }
                this.gridData.push(row);
            }
            if (this.returnPuzzle.initialPlanks) {
                this.planks = this.returnPuzzle.initialPlanks.map(p => ({ ...p }));
            } else if (this.returnPuzzle.planks) {
                this.planks = this.returnPuzzle.planks.map(p => ({ ...p }));
            }
        } else {
            for (let r = 0; r < this.editorRows; r++) {
                const row = [];
                for (let c = 0; c < this.editorCols; c++) {
                    row.push({ wallColor: 'RED', type: 'normal' });
                }
                this.gridData.push(row);
            }
        }

        // Layout
        this.gridTop = 50;
        this.gridHeight = height * 0.50;
        const padding = 5;
        const cellW = (width - padding * (this.editorCols + 1) - 20) / this.editorCols;
        const cellH = (this.gridHeight - padding * (this.editorRows + 1)) / this.editorRows;
        this.cellSize = Math.min(cellW, cellH);
        this.gridPadding = padding;
        const totalGridW = this.cellSize * this.editorCols + padding * (this.editorCols - 1);
        const totalGridH = this.cellSize * this.editorRows + padding * (this.editorRows - 1);
        this.gridOffsetX = (width - totalGridW) / 2;
        this.gridOffsetY = this.gridTop + (this.gridHeight - totalGridH) / 2;

        // Draw color palette
        this._drawPalette();

        // Draw gimmick selector
        this._drawGimmickSelector();

        // Draw grid
        this.gridContainer = this.add.container(0, 0);
        this._drawGrid();

        // Buttons
        const btnY = height - 55;
        const btnW = 130;
        const btnH = 38;
        const btnGap = 10;

        // Download button
        this.add.graphics()
            .fillStyle(0x27ae60, 1)
            .fillRoundedRect(width / 2 - btnW - btnGap / 2, btnY, btnW, btnH, 10);
        this.add.text(width / 2 - btnW / 2 - btnGap / 2, btnY + btnH / 2, '💾 다운로드', {
            fontSize: '15px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.zone(width / 2 - btnW / 2 - btnGap / 2, btnY + btnH / 2, btnW, btnH)
            .setInteractive()
            .on('pointerdown', () => this._downloadJSON());

        // Test play button
        this.add.graphics()
            .fillStyle(0x3498db, 1)
            .fillRoundedRect(width / 2 + btnGap / 2, btnY, btnW, btnH, 10);
        this.add.text(width / 2 + btnW / 2 + btnGap / 2, btnY + btnH / 2, '▶ 테스트', {
            fontSize: '15px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.zone(width / 2 + btnW / 2 + btnGap / 2, btnY + btnH / 2, btnW, btnH)
            .setInteractive()
            .on('pointerdown', () => this._testPlay());

        // Status text
        this.statusText = this.add.text(width / 2, btnY - 16, '', {
            fontSize: '13px', color: '#27ae60', fontFamily: 'Jua'
        }).setOrigin(0.5);

        // Grid input
        this.input.on('pointerdown', (pointer) => this._paintCell(pointer));
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) this._paintCell(pointer);
        });
    }

    _drawPalette() {
        const { width } = this.scale;
        const paletteY = this.gridTop + this.gridHeight + 10;
        const btnSize = 30;
        const spacing = width / (this.colors.length + 1);

        this.paletteButtons = [];
        this.paletteIndicator = this.add.graphics();

        for (let i = 0; i < this.colors.length; i++) {
            const x = spacing * (i + 1);
            const y = paletteY + 16;
            const colorKey = this.colors[i];

            const g = this.add.graphics();
            const hex = CONFIG.DISPLAY_COLORS[colorKey];
            const num = parseInt(hex.replace('#', ''), 16);
            g.fillStyle(num, 1);
            g.fillCircle(x, y, btnSize / 2);
            g.lineStyle(2, 0xcccccc, 1);
            g.strokeCircle(x, y, btnSize / 2);

            this.add.zone(x, y, btnSize, btnSize)
                .setInteractive()
                .on('pointerdown', () => {
                    this.selectedColor = colorKey;
                    this._updatePaletteIndicator();
                });

            this.paletteButtons.push({ x, y, btnSize, colorKey });
        }

        this._updatePaletteIndicator();
    }

    _drawGimmickSelector() {
        const { width } = this.scale;
        const y = this.gridTop + this.gridHeight + 52;

        this.add.text(10, y, '기믹:', {
            fontSize: '13px', color: '#555', fontFamily: 'Jua'
        });

        const labels = ['일반', '더러움', '무지개', '판자'];
        const btnW = 55;
        const startX = 55;

        this.gimmickBtns = [];
        this.gimmickIndicator = this.add.graphics();

        for (let i = 0; i < this.gimmicks.length; i++) {
            const x = startX + i * (btnW + 6);
            const gimmick = this.gimmicks[i];

            this.add.text(x + btnW / 2, y, labels[i], {
                fontSize: '12px', color: '#333', fontFamily: 'Jua'
            }).setOrigin(0.5, 0);

            this.add.zone(x + btnW / 2, y + 8, btnW, 20)
                .setInteractive()
                .on('pointerdown', () => {
                    this.selectedGimmick = gimmick;
                    this._updateGimmickIndicator();
                });

            this.gimmickBtns.push({ x, y, btnW, gimmick });
        }

        this._updateGimmickIndicator();
    }

    _updatePaletteIndicator() {
        this.paletteIndicator.clear();
        for (const pb of this.paletteButtons) {
            if (pb.colorKey === this.selectedColor) {
                this.paletteIndicator.lineStyle(3, 0xffaa00, 1);
                this.paletteIndicator.strokeCircle(pb.x, pb.y, pb.btnSize / 2 + 4);
            }
        }
    }

    _updateGimmickIndicator() {
        this.gimmickIndicator.clear();
        for (const gb of this.gimmickBtns) {
            if (gb.gimmick === this.selectedGimmick) {
                this.gimmickIndicator.lineStyle(2, 0xffaa00, 1);
                this.gimmickIndicator.strokeRoundedRect(gb.x, gb.y - 2, gb.btnW, 22, 4);
            }
        }
    }

    _drawGrid() {
        this.gridContainer.removeAll(true);

        for (let r = 0; r < this.editorRows; r++) {
            for (let c = 0; c < this.editorCols; c++) {
                const x = this.gridOffsetX + c * (this.cellSize + this.gridPadding);
                const y = this.gridOffsetY + r * (this.cellSize + this.gridPadding);
                const cell = this.gridData[r][c];

                const g = this.add.graphics();

                if (cell.type === 'rainbow') {
                    const rainbowColors = [0x00BCD4, 0xE91E63, 0xFFEB3B, 0x2979FF, 0x00C853, 0xE53935];
                    const stripeH = this.cellSize / rainbowColors.length;
                    g.fillStyle(0xffffff, 1);
                    g.fillRoundedRect(x, y, this.cellSize, this.cellSize, 5);
                    for (let i = 0; i < rainbowColors.length; i++) {
                        g.fillStyle(rainbowColors[i], 0.7);
                        g.fillRect(x + 2, y + 2 + i * stripeH, this.cellSize - 4, stripeH);
                    }
                } else {
                    const hex = CONFIG.DISPLAY_COLORS[cell.wallColor] || '#FFFFFF';
                    const num = parseInt(hex.replace('#', ''), 16);
                    g.fillStyle(num, 1);
                    g.fillRoundedRect(x, y, this.cellSize, this.cellSize, 5);
                    g.lineStyle(1, 0x999999, 1);
                    g.strokeRoundedRect(x, y, this.cellSize, this.cellSize, 5);
                }

                this.gridContainer.add(g);

                // 더러운 양 표시 (검은 양)
                if (cell.type === 'dirty') {
                    const sheepG = this.add.graphics();
                    const cx = x + this.cellSize / 2;
                    const cy = y + this.cellSize / 2;
                    const sheepSize = this.cellSize * 0.5;
                    sheepG.fillStyle(0x222222, 1);
                    sheepG.fillEllipse(cx, cy, sheepSize, sheepSize * 0.8);
                    sheepG.fillStyle(0x000000, 1);
                    sheepG.fillCircle(cx, cy - sheepSize * 0.2, sheepSize * 0.25);
                    this.gridContainer.add(sheepG);
                }
            }
        }

        // Draw planks
        const plankG = this.add.graphics();
        for (const plank of this.planks) {
            const px1 = this.gridOffsetX + plank.startCol * (this.cellSize + this.gridPadding) + 2;
            const px2 = this.gridOffsetX + plank.endCol * (this.cellSize + this.gridPadding) + this.cellSize - 2;
            const y = this.gridOffsetY + plank.row * (this.cellSize + this.gridPadding) + this.cellSize;
            const plankH = 4;
            const segW = 8, gapW = 4;
            let cx = px1;
            while (cx < px2) {
                const w = Math.min(segW, px2 - cx);
                plankG.fillStyle(0x8B5E3C, 1);
                plankG.fillRoundedRect(cx, y, w, plankH, 2);
                cx += segW + gapW;
            }
        }
        this.gridContainer.add(plankG);
    }

    _paintCell(pointer) {
        const col = Math.floor((pointer.x - this.gridOffsetX) / (this.cellSize + this.gridPadding));
        const row = Math.floor((pointer.y - this.gridOffsetY) / (this.cellSize + this.gridPadding));

        if (row < 0 || row >= this.editorRows || col < 0 || col >= this.editorCols) return;

        const cellX = this.gridOffsetX + col * (this.cellSize + this.gridPadding);
        const cellY = this.gridOffsetY + row * (this.cellSize + this.gridPadding);
        if (pointer.x < cellX || pointer.x > cellX + this.cellSize) return;
        if (pointer.y < cellY || pointer.y > cellY + this.cellSize) return;

        if (this.selectedGimmick === 'plank') {
            if (this._lastPlankCell && this._lastPlankCell.row === row && this._lastPlankCell.col === col) return;
            this._lastPlankCell = { row, col };
            if (col >= this.editorCols - 1) return;
            const existIdx = this.planks.findIndex(p => p.row === row && p.startCol === col && p.endCol === col + 1);
            if (existIdx !== -1) {
                this.planks.splice(existIdx, 1);
            } else {
                this.planks.push({ row, startCol: col, endCol: col + 1 });
            }
            this._drawGrid();
            return;
        }

        this._lastPlankCell = null;
        const cell = this.gridData[row][col];

        if (this.selectedGimmick === 'dirty') {
            if (cell.type === 'dirty') return;
            cell.type = 'dirty';
        } else if (this.selectedGimmick === 'rainbow') {
            if (cell.type === 'rainbow') return;
            cell.wallColor = 'RAINBOW';
            cell.type = 'rainbow';
        } else {
            const newColor = this.selectedColor;
            if (cell.wallColor === newColor && cell.type === 'normal') return;
            cell.wallColor = newColor;
            cell.type = 'normal';
        }

        this._drawGrid();
    }

    _buildStageData() {
        const grid = [];
        for (let r = 0; r < this.editorRows; r++) {
            const row = [];
            for (let c = 0; c < this.editorCols; c++) {
                const cell = this.gridData[r][c];
                row.push({
                    wallColor: cell.wallColor,
                    sheepComponents: cell.type === 'dirty' ? ['DIRTY'] : [],
                    alive: true,
                    type: cell.type,
                });
            }
            grid.push(row);
        }

        return {
            grid,
            initialGrid: JSON.parse(JSON.stringify(grid)),
            rows: this.editorRows,
            cols: this.editorCols,
            planks: this.planks.map(p => ({ ...p })),
            movesLeft: 99,
            initialMovesLeft: 99,
            totalBlocks: this.editorRows * this.editorCols,
            minMoves: 0,
            maxMoves: 0,
            solution: [],
            solutionStates: [],
            allMoves: [],
            maxComponents: 2,
            plankChance: 0,
            dirtyChance: 0,
            rainbowChance: 0,
        };
    }

    _downloadJSON() {
        const data = this._buildStageData();
        const json = JSON.stringify(data, null, 2);
        const filename = this.stageNum > 0 ? `stage${this.stageNum}.json` : 'stage.json';

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        this.statusText.setText(`${filename} 다운로드 완료!`);
        this.time.delayedCall(2000, () => this.statusText.setText(''));
    }

    _testPlay() {
        const data = this._buildStageData();
        this.scene.start('GameScene', {
            level: this.returnLevel,
            testData: data,
            stageNum: this.stageNum
        });
    }
}
