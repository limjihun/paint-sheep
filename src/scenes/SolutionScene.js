import { CONFIG } from '../config.js';
import { PuzzleManager } from '../logic/PuzzleManager.js';

export class SolutionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SolutionScene' });
    }

    preload() {
        const base = window.location.pathname.endsWith('/')
            ? window.location.pathname
            : window.location.pathname.replace(/\/[^/]*$/, '/');
        const a = base + 'assets/';
        this.load.setBaseURL('');
        this.load.setPath('');
        this.load.image('sheep', a + 'sheep.png');
        this.load.image('sunglasses', a + 'sunglasses.png');
    }

    init(data) {
        this.puzzle = data.puzzle;
        this.solution = this.puzzle.solution || [];
        this.solutionStates = this.puzzle.solutionStates || [];
        this.currentStep = 0;
        this.level = data.level || 0;
        this.fromGameOver = data.fromGameOver || false;
        this.cleared = data.cleared || false;
        this.movesLeft = data.movesLeft || 0;
    }

    create() {
        const { width, height } = this.scale;

        this.add.graphics()
            .fillStyle(0xf5e6d3, 1)
            .fillRect(-2, -2, width + 4, height + 4);

        // Header — use solution.length as the single source of truth
        this.add.text(width / 2, 30, `답지 (최소 ${this.solution.length}무브)`, {
            fontSize: '22px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back button
        this.add.text(15, 25, '← 돌아가기', {
            fontSize: '16px', color: '#1565C0', fontFamily: 'Jua'
        }).setInteractive()
          .on('pointerdown', () => {
              if (this.fromGameOver) {
                  this.scene.start('GameOverScene', { cleared: this.cleared, movesLeft: this.movesLeft, level: this.level, retryPuzzle: this.puzzle });
              } else {
                  this.scene.start('GameScene', { level: this.level, retryPuzzle: this.puzzle, resume: true });
              }
          });

        // Grid area — shrink to make room for row/col labels
        this.gridTop = 70;
        this.gridHeight = height * 0.50;
        this.labelSize = 20; // space for row/col number labels

        const padding = 5;
        const availW = width - this.labelSize - 10; // left label + margin
        const availH = this.gridHeight - this.labelSize - 5; // top label + margin
        const cellW = (availW - padding * (this.puzzle.cols + 1)) / this.puzzle.cols;
        const cellH = (availH - padding * (this.puzzle.rows + 1)) / this.puzzle.rows;
        this.cellSize = Math.min(cellW, cellH);
        this.gridPadding = padding;
        const totalGridW = this.cellSize * this.puzzle.cols + padding * (this.puzzle.cols - 1);
        const totalGridH = this.cellSize * this.puzzle.rows + padding * (this.puzzle.rows - 1);
        this.gridOffsetX = this.labelSize + (availW - totalGridW) / 2 + 5;
        this.gridOffsetY = this.gridTop + this.labelSize + (availH - totalGridH) / 2;

        // Step info
        this.stepText = this.add.text(width / 2, this.gridTop + this.gridHeight + 10, '', {
            fontSize: '16px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.moveDescText = this.add.text(width / 2, this.gridTop + this.gridHeight + 38, '', {
            fontSize: '14px', color: '#555', fontFamily: 'Jua', wordWrap: { width: width - 40 }
        }).setOrigin(0.5, 0);

        // Navigation buttons
        const btnY = height - 60;
        const btnW = 100;
        const btnH = 40;

        // Prev button
        this.add.graphics()
            .fillStyle(0x999999, 1)
            .fillRoundedRect(width / 2 - btnW - 20, btnY, btnW, btnH, 8);
        this.add.text(width / 2 - btnW / 2 - 20, btnY + btnH / 2, '◀ 이전', {
            fontSize: '16px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.zone(width / 2 - btnW / 2 - 20, btnY + btnH / 2, btnW, btnH)
            .setInteractive()
            .on('pointerdown', () => this._prevStep());

        // Next button
        this.add.graphics()
            .fillStyle(0x2979FF, 1)
            .fillRoundedRect(width / 2 + 20, btnY, btnW, btnH, 8);
        this.add.text(width / 2 + btnW / 2 + 20, btnY + btnH / 2, '다음 ▶', {
            fontSize: '16px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.zone(width / 2 + btnW / 2 + 20, btnY + btnH / 2, btnW, btnH)
            .setInteractive()
            .on('pointerdown', () => this._nextStep());


        // Build states for each step
        this._buildStepStates();
        this._renderStep();
    }

    _buildStepStates() {
        this.stepStates = this.solutionStates;
    }

    _renderStep() {
        if (this.gridContainer) this.gridContainer.destroy();
        this.gridContainer = this.add.container(0, 0);

        // Show the grid state BEFORE this move, with the move highlighted
        const grid = this.stepStates[this.currentStep];
        const move = this.currentStep < this.solution.length ? this.solution[this.currentStep] : null;

        // Highlight cells that will be painted in this step
        const highlightSet = new Set();
        if (move && move.cells) {
            for (const { row, col } of move.cells) {
                highlightSet.add(`${row},${col}`);
            }
        }

        // Column labels (top)
        for (let col = 0; col < this.puzzle.cols; col++) {
            const x = this.gridOffsetX + col * (this.cellSize + this.gridPadding) + this.cellSize / 2;
            const y = this.gridOffsetY - 14;
            const label = this.add.text(x, y, `${col}`, {
                fontSize: '12px', color: '#666', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.gridContainer.add(label);
        }

        // Row labels (left)
        for (let row = 0; row < this.puzzle.rows; row++) {
            const x = this.gridOffsetX - 14;
            const y = this.gridOffsetY + row * (this.cellSize + this.gridPadding) + this.cellSize / 2;
            const label = this.add.text(x, y, `${row}`, {
                fontSize: '12px', color: '#666', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.gridContainer.add(label);
        }

        for (let row = 0; row < this.puzzle.rows; row++) {
            for (let col = 0; col < this.puzzle.cols; col++) {
                const cell = grid[row][col];
                const x = this.gridOffsetX + col * (this.cellSize + this.gridPadding);
                const y = this.gridOffsetY + row * (this.cellSize + this.gridPadding);

                if (!cell.alive) {
                    const bg = this.add.graphics();
                    bg.fillStyle(0xdddddd, 0.3);
                    bg.fillRoundedRect(x, y, this.cellSize, this.cellSize, 4);
                    this.gridContainer.add(bg);
                    continue;
                }

                // Wall
                const wall = this.add.graphics();
                if (cell.type === 'rainbow' || cell.wallColor === 'RAINBOW') {
                    const rainbowColors = [0x00BCD4, 0xE91E63, 0xFFEB3B, 0x2979FF, 0x00C853, 0xE53935];
                    const stripeH = this.cellSize / rainbowColors.length;
                    wall.fillStyle(0xffffff, 1);
                    wall.fillRoundedRect(x, y, this.cellSize, this.cellSize, 6);
                    for (let i = 0; i < rainbowColors.length; i++) {
                        wall.fillStyle(rainbowColors[i], 0.7);
                        wall.fillRect(x + 2, y + 2 + i * stripeH, this.cellSize - 4, stripeH);
                    }
                } else {
                    const wallHex = this._getColorHex(cell.wallColor);
                    const wallNum = parseInt(wallHex.replace('#', ''), 16);
                    wall.fillStyle(wallNum, 1);
                    wall.fillRoundedRect(x, y, this.cellSize, this.cellSize, 6);
                }
                this.gridContainer.add(wall);

                // Sheep image
                const cx = x + this.cellSize / 2;
                const cy = y + this.cellSize / 2;
                const sheepSrc = this.textures.get('sheep').getSourceImage();
                const sheepH = this.cellSize * 0.7;
                const sheepScale = sheepH / sheepSrc.height;
                const sheepW = sheepSrc.width * sheepScale;
                const sheep = this.add.image(cx, cy, 'sheep').setDisplaySize(sheepW, sheepH);
                const resolved = PuzzleManager.resolveColor(cell.sheepComponents);
                if (resolved !== 'WHITE') {
                    const sheepHex = this._getColorHex(resolved);
                    const sheepNum = parseInt(sheepHex.replace('#', ''), 16);
                    sheep.setTint(sheepNum);
                }
                this.gridContainer.add(sheep);

            }
        }

        // Draw planks
        const planks = this.puzzle.planks || this.puzzle.initialPlanks || [];
        if (planks.length > 0) {
            const plankGfx = this.add.graphics();
            for (const plank of planks) {
                const px1 = this.gridOffsetX + plank.startCol * (this.cellSize + this.gridPadding) + 2;
                const px2 = this.gridOffsetX + plank.endCol * (this.cellSize + this.gridPadding) + this.cellSize - 2;
                const py = this.gridOffsetY + plank.row * (this.cellSize + this.gridPadding) + this.cellSize;
                const plankH = 4;
                const segW = 8, gapW = 4;
                let cx = px1;
                while (cx < px2) {
                    const w = Math.min(segW, px2 - cx);
                    plankGfx.fillStyle(0x8B5E3C, 1);
                    plankGfx.fillRoundedRect(cx, py, w, plankH, 2);
                    cx += segW + gapW;
                }
            }
            this.gridContainer.add(plankGfx);
        }

        // Draw dot for single-cell move
        if (move && move.cells && move.cells.length === 1) {
            const dotGfx = this.add.graphics();
            const step = this.cellSize + this.gridPadding;
            const cx = this.gridOffsetX + move.cells[0].col * step + this.cellSize / 2;
            const cy = this.gridOffsetY + move.cells[0].row * step + this.cellSize / 2;
            dotGfx.fillStyle(0x222222, 1);
            dotGfx.fillCircle(cx, cy, 8);
            this.gridContainer.add(dotGfx);
        }

        // Draw arrow path for current move
        if (move && move.cells && move.cells.length >= 2) {
            const arrowGfx = this.add.graphics();
            arrowGfx.lineStyle(5, 0x222222, 1);

            const step = this.cellSize + this.gridPadding;
            const points = move.cells.map(c => ({
                x: this.gridOffsetX + c.col * step + this.cellSize / 2,
                y: this.gridOffsetY + c.row * step + this.cellSize / 2,
            }));

            // Draw line segments — stop short of last point so arrowhead doesn't overlap
            const headLen = 14;
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
            const stopDist = headLen * 0.6;
            const stopX = last.x - stopDist * Math.cos(angle);
            const stopY = last.y - stopDist * Math.sin(angle);

            arrowGfx.beginPath();
            arrowGfx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length - 1; i++) {
                arrowGfx.lineTo(points[i].x, points[i].y);
            }
            arrowGfx.lineTo(stopX, stopY);
            arrowGfx.strokePath();
            arrowGfx.fillStyle(0x222222, 1);
            arrowGfx.beginPath();
            arrowGfx.moveTo(last.x, last.y);
            arrowGfx.lineTo(
                last.x - headLen * Math.cos(angle - Math.PI / 6),
                last.y - headLen * Math.sin(angle - Math.PI / 6)
            );
            arrowGfx.lineTo(
                last.x - headLen * Math.cos(angle + Math.PI / 6),
                last.y - headLen * Math.sin(angle + Math.PI / 6)
            );
            arrowGfx.closePath();
            arrowGfx.fillPath();

            this.gridContainer.add(arrowGfx);
        }

        // Update text
        if (this.solution.length === 0) {
            this.stepText.setText('답을 찾지 못했습니다');
            this.moveDescText.setText('');
        } else if (this.currentStep >= this.solution.length) {
            this.stepText.setText('완료!');
            this.moveDescText.setText('');
        } else {
            this.stepText.setText(`${this.currentStep + 1}/${this.solution.length} 무브`);
            const desc = this._describeMov(move, grid);
            this.moveDescText.setText(desc);
        }
    }

    _describeMov(move, grid) {
        if (!move) return '';
        const colorName = move.component === 'WASH' ? '세척(💧)' :
            (CONFIG.COLOR_NAMES[move.component] || move.component);
        const validCells = move.cells.filter(c => grid && grid[c.row] && grid[c.row][c.col] && grid[c.row][c.col].alive);
        const cellDescs = validCells.map(c => `(${c.row},${c.col})`).join(' → ');
        return `${colorName} 칠하기: ${cellDescs}`;
    }

    _getColorHex(colorKey) {
        if (CONFIG.DISPLAY_COLORS[colorKey]) return CONFIG.DISPLAY_COLORS[colorKey];
        if (CONFIG.MIXED_COLORS[colorKey]) return CONFIG.MIXED_COLORS[colorKey].hex;
        return '#FFFFFF';
    }

    _prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this._renderStep();
        }
    }

    _nextStep() {
        if (this.currentStep < this.stepStates.length - 1) {
            this.currentStep++;
            this._renderStep();
        }
    }
}
