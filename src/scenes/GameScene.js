import { CONFIG } from '../config.js';
import { PuzzleManager } from '../logic/PuzzleManager.js';

const TOTAL_STAGES = 100;
const _STAGE_CACHE_MAX = 5;
const _stageCache = new Map();

async function _loadStage(stageNum) {
    if (_stageCache.has(stageNum)) return _stageCache.get(stageNum);
    const base = window.location.pathname.endsWith('/')
        ? window.location.pathname
        : window.location.pathname.replace(/\/[^/]*$/, '/');
    const pack = localStorage.getItem('paintSheep_stagePack') || 'NoMaxStages';
    const url = `${base}src/data/${pack}/stage${stageNum}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (_stageCache.size >= _STAGE_CACHE_MAX) {
        const oldest = _stageCache.keys().next().value;
        _stageCache.delete(oldest);
    }
    _stageCache.set(stageNum, data);
    return data;
}

function _getStageNum(level) {
    const num = level - CONFIG.TUTORIAL_COUNT + 1;
    if (num >= 1 && num <= TOTAL_STAGES) return num;
    return -1;
}

let _nextPuzzleData = null;
let _nextPuzzleLevel = null;
let _puzzleWorker = null;

function _prefetchNextPuzzle(level) {
    if (level < CONFIG.TUTORIAL_COUNT) return;
    if (_getStageNum(level) > 0) {
        _loadStage(_getStageNum(level));
        return;
    }
    _nextPuzzleData = null;
    _nextPuzzleLevel = level;
    if (_puzzleWorker) _puzzleWorker.terminate();
    try {
        _puzzleWorker = new Worker(new URL('../logic/puzzleWorker.js', import.meta.url), { type: 'module' });
        _puzzleWorker.onmessage = (e) => {
            _nextPuzzleData = e.data;
            _puzzleWorker.terminate();
            _puzzleWorker = null;
        };
        _puzzleWorker.onerror = () => {
            _puzzleWorker.terminate();
            _puzzleWorker = null;
        };
        _puzzleWorker.postMessage({ level });
    } catch (e) {
        _puzzleWorker = null;
    }
}

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        const base = window.location.pathname.endsWith('/')
            ? window.location.pathname
            : window.location.pathname.replace(/\/[^/]*$/, '/');
        const a = base + 'assets/';
        this.load.setBaseURL('');
        this.load.setPath('');
        this.load.image('paint', a + 'paint.png');
        this.load.image('tape', a + 'tape.png');
        this.load.image('wolf', a + 'wolf.png');
        this.load.image('sheep', a + 'sheep.png');
        this.load.image('sheepface', a + 'sheepface.png');
        this.load.image('sunglasses', a + 'sunglasses.png');
    }

    init(data) {
        this.currentLevel = data.level || 0;
        this._retryPuzzle = data.retryPuzzle || null;
        this._resumeMode = data.resume || false;
        this._testData = data.testData || null;
        this._testStageNum = data.stageNum || 0;
    }

    create() {
        const { width, height } = this.scale;
        this.gameWidth = width;
        this.gameHeight = height;

        if (this._testData) {
            this.puzzle = PuzzleManager.fromWorkerData(this._testData);
        } else if (this._retryPuzzle) {
            this.puzzle = this._retryPuzzle;
            if (!this._resumeMode) {
                this.puzzle.reset();
            }
        } else if (_getStageNum(this.currentLevel) > 0) {
            const stageNum = _getStageNum(this.currentLevel);
            if (_stageCache.has(stageNum)) {
                this.puzzle = PuzzleManager.fromWorkerData(_stageCache.get(stageNum));
            } else {
                const messages = ['양들이 숨는 중', '페인트 가져오는 중', '늑대 기다리는 중', '선글라스 닦는 중'];
                const msg = messages[Math.floor(Math.random() * messages.length)];
                const loadingText = this.add.text(width / 2, height / 2, msg + '.', {
                    fontSize: '20px', color: '#555', fontFamily: 'Jua'
                }).setOrigin(0.5);
                let dotCount = 1;
                const dotTimer = this.time.addEvent({
                    delay: 400, loop: true,
                    callback: () => { dotCount = (dotCount % 3) + 1; loadingText.setText(msg + '.'.repeat(dotCount)); }
                });
                _loadStage(stageNum).then(data => {
                    dotTimer.destroy();
                    loadingText.destroy();
                    if (data) {
                        this.puzzle = PuzzleManager.fromWorkerData(data);
                    } else {
                        this.puzzle = new PuzzleManager(this.currentLevel);
                    }
                    this._initAfterPuzzle();
                });
                return;
            }
        } else if (_nextPuzzleData && _nextPuzzleLevel === this.currentLevel) {
            this.puzzle = PuzzleManager.fromWorkerData(_nextPuzzleData);
            _nextPuzzleData = null;
        } else if (_puzzleWorker && _nextPuzzleLevel === this.currentLevel) {
            const messages = ['양들이 숨는 중', '페인트 가져오는 중', '늑대 기다리는 중', '선글라스 닦는 중'];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            const loadingText = this.add.text(width / 2, height / 2, msg + '.', {
                fontSize: '20px', color: '#555', fontFamily: 'Jua'
            }).setOrigin(0.5);
            let dotCount = 1;
            const dotTimer = this.time.addEvent({
                delay: 400,
                loop: true,
                callback: () => {
                    dotCount = (dotCount % 3) + 1;
                    loadingText.setText(msg + '.'.repeat(dotCount));
                }
            });
            _puzzleWorker.onmessage = (e) => {
                _nextPuzzleData = e.data;
                _puzzleWorker.terminate();
                _puzzleWorker = null;
                dotTimer.destroy();
                loadingText.destroy();
                this.puzzle = PuzzleManager.fromWorkerData(_nextPuzzleData);
                _nextPuzzleData = null;
                this._initAfterPuzzle();
            };
            _puzzleWorker.onerror = () => {
                _puzzleWorker.terminate();
                _puzzleWorker = null;
                dotTimer.destroy();
                loadingText.destroy();
                this.puzzle = new PuzzleManager(this.currentLevel);
                this._initAfterPuzzle();
            };
            return;
        } else {
            this.puzzle = new PuzzleManager(this.currentLevel);
        }
        this._initAfterPuzzle();
    }

    _initAfterPuzzle() {
        _prefetchNextPuzzle(this.currentLevel + 1);
        this.selectedColor = null;
        this.isWashMode = false;
        this.isDragging = false;
        this.dragPath = [];
        this.blockViews = [];
        this.isAnimating = false;
        this.itemMode = null;
        this.isMegaStage = (localStorage.getItem('paintSheep_stagePack') || 'NoMaxStages') === 'MegaStages';
        this.megaScore = 0;
        this._megaScoreHistory = [];

        if (_getStageNum(this.currentLevel) > 0) {
            const pack = localStorage.getItem('paintSheep_stagePack') || 'NoMaxStages';
            const stageNum = _getStageNum(this.currentLevel);
            const key = `paintSheep_progress_${pack}`;
            const saved = parseInt(localStorage.getItem(key)) || 0;
            if (stageNum > saved) {
                localStorage.setItem(key, stageNum);
            }
        }

        this._createHeader();
        this._createTutorialMessage();
        this._createGrid();
        this._createPalette();
        this._createItemSlots();
        this._setupDragInput();
        this._createDebugUI();
        this._showTutorialStep();
    }

    _createHeader() {
        const { width, height } = this.scale;
        const headerH = height * CONFIG.LAYOUT.HEADER_RATIO;

        const wolfImg = this.add.image(0, headerH / 2, 'wolf');
        const wolfH = headerH - 10;
        const wolfScale = wolfH / wolfImg.height;
        const wolfW = wolfImg.width * wolfScale;
        wolfImg.setDisplaySize(wolfW, wolfH);
        wolfImg.setPosition(6 + wolfW / 2, headerH / 2);

        const stageNum = _getStageNum(this.currentLevel);
        const stageLabel = stageNum > 0 ? `Stage ${stageNum}` : (this.puzzle.tutorialData ? '튜토리얼' : 'Stage ?');
        this.add.text(6 + wolfW + 8, headerH / 2 - 12, stageLabel, {
            fontSize: '13px', color: '#888', fontFamily: 'Jua'
        }).setOrigin(0, 0.5);

        this.movesText = this.add.text(6 + wolfW + 8, headerH / 2 + 8, `남은 턴: ${this.puzzle.movesLeft}`, {
            fontSize: '20px', color: '#333', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        if (this.isMegaStage) {
            this.scoreText = this.add.text(width - 10, headerH / 2 + 8, `점수: ${this.megaScore}`, {
                fontSize: '20px', color: '#e67e22', fontFamily: 'Jua', fontStyle: 'bold'
            }).setOrigin(1, 0.5);
        }

        this.headerHeight = headerH;
    }

    _createTutorialMessage() {
        const tutorial = this.puzzle.tutorialData;
        if (!tutorial || !tutorial.steps) {
            this.tutorialSteps = null;
            return;
        }
        this.tutorialSteps = tutorial.steps;
        this.tutorialStepIndex = this.puzzle._tutorialStepIndex || 0;

        const { width } = this.scale;
        const msgY = this.headerHeight + 4;
        this.tutorialText = this.add.text(width / 2, msgY, '', {
            fontSize: '16px', color: '#d32f2f', fontFamily: 'Jua', fontStyle: 'bold',
            wordWrap: { width: width - 20 }, align: 'center'
        }).setOrigin(0.5, 0).setDepth(999);

        this.tutorialHighlightGfx = this.add.graphics().setDepth(998);
    }

    _showTutorialStep() {
        if (!this.tutorialSteps) return;
        if (this.tutorialStepIndex >= this.tutorialSteps.length) {
            this.tutorialText.setText('');
            this.tutorialHighlightGfx.clear();
            this.tutorialSteps = null;
            return;
        }

        const step = this.tutorialSteps[this.tutorialStepIndex];
        this.tutorialText.setText(step.message || '');
        this._drawTutorialHighlight(step.highlight);
    }

    _drawTutorialHighlight(highlight) {
        this.tutorialHighlightGfx.clear();
        this._tutorialHighlightData = highlight || null;
        if (!highlight) return;
        this._tutorialPulseTime = 0;
        this._renderTutorialHighlight();
    }

    _clearTutorialHighlight() {
        if (this.tutorialHighlightGfx) this.tutorialHighlightGfx.clear();
        this._tutorialHighlightData = null;
    }

    _renderTutorialHighlight() {
        const highlight = this._tutorialHighlightData;
        if (!highlight) return;

        this.tutorialHighlightGfx.clear();
        const t = (this._tutorialPulseTime || 0) / 700;
        const s = (Math.sin(t * Math.PI * 2) + 1) / 2;
        const expand = s * 4;

        this.tutorialHighlightGfx.lineStyle(3 + s * 2, 0xff4400, 0.9);

        if (highlight.type === 'palette') {
            const pb = this.paletteButtons.find(p => p.colorKey === highlight.color);
            if (pb) {
                const r = pb.btnSize / 2 + 4 + expand;
                this.tutorialHighlightGfx.fillStyle(0xff4400, 0.1);
                this.tutorialHighlightGfx.fillCircle(pb.x, pb.y, r);
                this.tutorialHighlightGfx.strokeCircle(pb.x, pb.y, r);
            }
        } else if (highlight.type === 'cells') {
            const cellSet = new Set(highlight.cells.map(c => `${c[0]},${c[1]}`));
            const step = this.cellSize + this.gridPadding;
            const gfx = this.tutorialHighlightGfx;
            const margin = 3;

            for (const [row, col] of highlight.cells) {
                const x = this.gridOffsetX + col * step - margin;
                const y = this.gridOffsetY + row * step - margin;
                const w = this.cellSize + margin * 2;
                const h = this.cellSize + margin * 2;

                if (!cellSet.has(`${row - 1},${col}`)) {
                    gfx.lineBetween(x, y, x + w, y);
                }
                if (!cellSet.has(`${row + 1},${col}`)) {
                    gfx.lineBetween(x, y + h, x + w, y + h);
                }
                if (!cellSet.has(`${row},${col - 1}`)) {
                    gfx.lineBetween(x, y, x, y + h);
                }
                if (!cellSet.has(`${row},${col + 1}`)) {
                    gfx.lineBetween(x + w, y, x + w, y + h);
                }
            }
        } else if (highlight.type === 'item') {
            const ib = this.itemButtons.find(b => b.label === highlight.item);
            if (ib) {
                this.tutorialHighlightGfx.fillStyle(0xff4400, 0.1);
                this.tutorialHighlightGfx.fillRoundedRect(
                    ib.x - ib.btnSize / 2 - 4 - expand, ib.y - ib.btnSize / 2 - 4 - expand,
                    ib.btnSize + 8 + expand * 2, ib.btnSize + 8 + expand * 2, 12
                );
                this.tutorialHighlightGfx.strokeRoundedRect(
                    ib.x - ib.btnSize / 2 - 4 - expand, ib.y - ib.btnSize / 2 - 4 - expand,
                    ib.btnSize + 8 + expand * 2, ib.btnSize + 8 + expand * 2, 12
                );
            }
        } else if (highlight.type === 'debug') {
            if (highlight.button === 'colorGuide' && this.colorGuideBtn) {
                const b = this.colorGuideBtn.getBounds();
                this.tutorialHighlightGfx.fillStyle(0xff4400, 0.1);
                this.tutorialHighlightGfx.fillRoundedRect(
                    b.x - 3 - expand, b.y - 3 - expand,
                    b.width + 6 + expand * 2, b.height + 6 + expand * 2, 6
                );
                this.tutorialHighlightGfx.strokeRoundedRect(
                    b.x - 3 - expand, b.y - 3 - expand,
                    b.width + 6 + expand * 2, b.height + 6 + expand * 2, 6
                );
            }
        }
    }

    _checkTutorialCondition(eventType, detail) {
        if (!this.tutorialSteps) return;
        if (this.tutorialStepIndex >= this.tutorialSteps.length) return;

        const step = this.tutorialSteps[this.tutorialStepIndex];
        const cond = step.condition;
        if (!cond) return;

        let met = false;
        if (cond.type === 'selectColor' && eventType === 'selectColor') {
            met = detail.color === cond.color;
        } else if (cond.type === 'paint' && eventType === 'paint') {
            if (cond.cells) {
                const required = new Set(cond.cells.map(c => `${c[0]},${c[1]}`));
                const painted = new Set((detail.cells || []).map(c => `${c.row},${c.col}`));
                met = required.size <= painted.size && [...required].every(k => painted.has(k));
            } else {
                met = true;
            }
        } else if (cond.type === 'wash' && eventType === 'wash') {
            if (cond.cells) {
                const required = new Set(cond.cells.map(c => `${c[0]},${c[1]}`));
                const washed = new Set((detail.cells || []).map(c => `${c.row},${c.col}`));
                met = required.size <= washed.size && [...required].every(k => washed.has(k));
            } else {
                met = true;
            }
        } else if (cond.type === 'clear' && eventType === 'clear') {
            met = true;
        } else if (cond.type === 'useItem' && eventType === 'useItem') {
            met = detail.item === cond.item;
        } else if (cond.type === 'selectItem' && eventType === 'selectItem') {
            met = detail.item === cond.item;
        } else if (cond.type === 'openColorGuide' && eventType === 'openColorGuide') {
            met = true;
        }

        if (met) {
            this.tutorialStepIndex++;
            this.puzzle._tutorialStepIndex = this.tutorialStepIndex;
            this._showTutorialStep();
        }
    }

    _isTutorialBlocked(eventType, detail) {
        if (!this.tutorialSteps) return false;
        if (this.tutorialStepIndex >= this.tutorialSteps.length) return false;

        const cond = this.tutorialSteps[this.tutorialStepIndex].condition;
        if (!cond) return false;

        let allowed = false;
        if (cond.type === 'selectColor' && eventType === 'selectColor') {
            allowed = detail.color === cond.color;
        } else if (cond.type === 'paint') {
            allowed = (eventType === 'paint' || eventType === 'selectColor');
        } else if (cond.type === 'wash') {
            allowed = (eventType === 'wash' || eventType === 'selectColor');
        } else if (cond.type === 'clear') {
            allowed = true;
        } else if (cond.type === 'selectItem' && eventType === 'selectItem') {
            allowed = detail.item === cond.item;
        } else if (cond.type === 'useItem') {
            allowed = (eventType === 'useItem' && detail.item === cond.item) || eventType === 'selectItem';
        }

        if (!allowed) {
            this._showToast('튜토리얼을 완료해주세요');
            return true;
        }
        return false;
    }

    _createGrid() {
        const { width, height } = this.scale;
        const gridTop = height * CONFIG.LAYOUT.HEADER_RATIO;
        const gridHeight = height * CONFIG.LAYOUT.GRID_RATIO;

        this.gridTop = gridTop;
        this.gridHeight = gridHeight;

        const padding = 6;
        const cellW = (width - padding * (this.puzzle.cols + 1)) / this.puzzle.cols;
        const cellH = (gridHeight - padding * (this.puzzle.rows + 1)) / this.puzzle.rows;
        const cellSize = Math.min(cellW, cellH);

        this.cellSize = cellSize;
        this.gridPadding = padding;
        const totalGridW = cellSize * this.puzzle.cols + padding * (this.puzzle.cols - 1);
        this.gridOffsetX = (width - totalGridW) / 2;
        const totalGridH = cellSize * this.puzzle.rows + padding * (this.puzzle.rows - 1);
        this.gridOffsetY = gridTop + (gridHeight - totalGridH) / 2;

        this.blockViews = [];
        for (let row = 0; row < this.puzzle.rows; row++) {
            const rowViews = [];
            for (let col = 0; col < this.puzzle.cols; col++) {
                const cell = this.puzzle.grid[row][col];
                const view = this._createBlockView(row, col, cell);
                rowViews.push(view);
            }
            this.blockViews.push(rowViews);
        }

        this._drawPlanks();
    }

    _drawPlanks() {
        if (this.plankGfx) this.plankGfx.destroy();
        this.plankGfx = this.add.graphics().setDepth(0);

        if (!this.puzzle.planks || this.puzzle.planks.length === 0) return;

        for (const plank of this.puzzle.planks) {
            this._drawPlankWithHoles(this.plankGfx, plank);
        }
    }

    _drawPlankWithHoles(gfx, plank) {
        const x1 = this.gridOffsetX + plank.startCol * (this.cellSize + this.gridPadding) + 2;
        const x2 = this.gridOffsetX + plank.endCol * (this.cellSize + this.gridPadding) + this.cellSize - 2;
        const y = this.gridOffsetY + plank.row * (this.cellSize + this.gridPadding) + this.cellSize;
        const plankH = 4;
        const totalW = x2 - x1;
        const segW = 8;
        const gapW = 4;

        let cx = x1;
        while (cx < x2) {
            const w = Math.min(segW, x2 - cx);
            gfx.fillStyle(0x8B5E3C, 1);
            gfx.fillRoundedRect(cx, y, w, plankH, 2);
            cx += segW + gapW;
        }
    }

    _createBlockView(row, col, cell) {
        const x = this.gridOffsetX + col * (this.cellSize + this.gridPadding);
        const y = this.gridOffsetY + row * (this.cellSize + this.gridPadding);

        const container = this.add.container(x + this.cellSize / 2, y + this.cellSize / 2);

        if (!cell.alive) {
            container.setAlpha(0);
            return { container, wall: null, sheep: null, row, col };
        }

        const wall = this.add.graphics();
        if (cell.type === 'rainbow') {
            this._drawRainbowWall(wall);
        } else {
            this._drawWallDiagonal(wall, cell.wallColor);
        }
        const wallMaskGfx = this.make.graphics({ x: x + this.cellSize / 2, y: y + this.cellSize / 2 });
        wallMaskGfx.fillStyle(0xffffff);
        wallMaskGfx.fillRoundedRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 12);
        wall.setMask(wallMaskGfx.createGeometryMask());
        container.add(wall);

        // Color blind icons on wall
        if (this._isColorBlind() && cell.wallColor && cell.wallColor !== 'WHITE' && cell.wallColor !== 'RAINBOW') {
            const cbGfx = this.add.graphics();
            const order = ['RED', 'YELLOW', 'BLUE'];
            const comps = CONFIG.MIXED_COLORS[cell.wallColor] ? order.filter(c => CONFIG.MIXED_COLORS[cell.wallColor].components.includes(c)) : [];
            const iconSize = this.cellSize * 0.096;
            const margin = this.cellSize * 0.33;
            // Positions based on count: 1→LT, 2→LT+RB, 3→LT+RT+RB
            const posMap = [
                [{ x: -margin, y: -margin }],
                [{ x: -margin, y: -margin }, { x: margin, y: margin }],
                [{ x: -margin, y: -margin }, { x: margin, y: -margin }, { x: margin, y: margin }],
            ];
            const positions = posMap[comps.length - 1] || [];
            for (let ci = 0; ci < comps.length; ci++) {
                const pos = positions[ci];
                this._drawColorBlindIcon(cbGfx, pos.x, pos.y, iconSize, comps[ci]);
            }
            container.add(cbGfx);
        }

        const sheepImg = this.textures.get('sheep').getSourceImage();
        const sheepH = this.cellSize * 0.7;
        const sheepScale = sheepH / sheepImg.height;
        const sheepW = sheepImg.width * sheepScale;
        const sheep = this.add.image(0, 0, 'sheep').setDisplaySize(sheepW, sheepH);
        this._applySheepVisual(sheep, cell.sheepComponents, cell.wallColor);
        container.add(sheep);

        const sheepOverlay = this.add.graphics();
        const maskImage = this.add.image(x + this.cellSize / 2, y + this.cellSize / 2, 'sheep').setDisplaySize(sheepW, sheepH).setVisible(false);
        sheepOverlay.setMask(maskImage.createBitmapMask());
        container.add(sheepOverlay);
        this._drawSheepDiagonal(sheepOverlay, cell.sheepComponents, sheepW, sheepH, cell.wallColor);

        const sheepFace = this.add.image(0, 0, 'sheepface').setDisplaySize(sheepW, sheepH);
        container.add(sheepFace);

        if (cell.masked) {
            const mask = this.add.graphics();
            mask.fillStyle(0xffeeaa, 0.6);
            mask.fillRoundedRect(-this.cellSize / 2 + 2, -this.cellSize / 2 + 2, this.cellSize - 4, this.cellSize - 4, 10);
            container.add(mask);
        }

        return { container, wall, wallMaskGfx, sheep, sheepOverlay, sheepMask: maskImage, sheepW, sheepH, row, col };
    }

    _getColorMode() {
        return localStorage.getItem('paintSheep_colorMode') || 'mixed';
    }

    _isColorBlind() {
        return localStorage.getItem('paintSheep_colorBlind') === 'true';
    }

    _drawColorBlindIcon(graphics, cx, cy, size, colorKey) {
        graphics.lineStyle(2, 0xffffff, 0.85);
        if (colorKey === 'RED') {
            graphics.strokeCircle(cx, cy, size);
        } else if (colorKey === 'YELLOW') {
            graphics.beginPath();
            graphics.moveTo(cx, cy - size);
            graphics.lineTo(cx + size, cy + size * 0.7);
            graphics.lineTo(cx - size, cy + size * 0.7);
            graphics.closePath();
            graphics.strokePath();
        } else if (colorKey === 'BLUE') {
            const s = size * 0.85;
            graphics.strokeRect(cx - s, cy - s, s * 2, s * 2);
        }
    }

    _drawWallDiagonal(graphics, wallColor) {
        const s = this.cellSize;
        const h = s / 2;
        const components = CONFIG.MIXED_COLORS[wallColor] ? CONFIG.MIXED_COLORS[wallColor].components : null;

        if (!components || components.length <= 1) {
            const hex = this._getWallColorHex(wallColor);
            const num = parseInt(hex.replace('#', ''), 16);
            graphics.fillStyle(num, 1);
            graphics.fillRoundedRect(-h, -h, s, s, 12);
            return;
        }

        // Mixed mode: show the result color as solid
        if (this._getColorMode() === 'mixed') {
            const hex = this._getWallColorHex(wallColor);
            const num = parseInt(hex.replace('#', ''), 16);
            graphics.fillStyle(num, 1);
            graphics.fillRoundedRect(-h, -h, s, s, 12);
            return;
        }

        // Diagonal mode
        graphics.fillStyle(0xeeeeee, 1);
        graphics.fillRoundedRect(-h, -h, s, s, 12);

        const order = ['RED', 'YELLOW', 'BLUE'];
        const sorted = order.filter(c => components.includes(c));

        if (sorted.length === 2) {
            const c1 = parseInt(this._getWallColorHex(sorted[0]).replace('#', ''), 16);
            const c2 = parseInt(this._getWallColorHex(sorted[1]).replace('#', ''), 16);
            graphics.fillStyle(c1, 1);
            graphics.fillTriangle(-h, -h, h, -h, -h, h);
            graphics.fillStyle(c2, 1);
            graphics.fillTriangle(h, -h, h, h, -h, h);
        } else if (sorted.length === 3) {
            const c1 = parseInt(this._getWallColorHex(sorted[0]).replace('#', ''), 16);
            const c2 = parseInt(this._getWallColorHex(sorted[1]).replace('#', ''), 16);
            const c3 = parseInt(this._getWallColorHex(sorted[2]).replace('#', ''), 16);
            const t = h * 0.45;
            graphics.fillStyle(c1, 1);
            graphics.fillTriangle(-h, -h, t, -h, -h, t);
            graphics.fillStyle(c2, 1);
            graphics.beginPath();
            graphics.moveTo(t, -h);
            graphics.lineTo(h, -h);
            graphics.lineTo(h, -t);
            graphics.lineTo(-t, h);
            graphics.lineTo(-h, h);
            graphics.lineTo(-h, t);
            graphics.closePath();
            graphics.fillPath();
            graphics.fillStyle(c3, 1);
            graphics.fillTriangle(h, -t, h, h, -t, h);
        }
    }

    _drawSheepDiagonal(graphics, components, w, h, wallColor) {
        graphics.clear();
        if (!components || components.length === 0) return;

        const s = this.cellSize / 2;

        if (components.includes('DIRTY')) {
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(-s, -s, s * 2, s * 2);
            graphics.fillStyle(0x333333, 1);
            graphics.fillRect(-s, -s, s * 2, s * 2);
            return;
        }

        const order = ['RED', 'YELLOW', 'BLUE'];
        const sorted = order.filter(c => components.includes(c));
        if (sorted.length === 0) return;

        const wallComps = (wallColor && CONFIG.MIXED_COLORS[wallColor])
            ? CONFIG.MIXED_COLORS[wallColor].components : null;
        const wallSlots = (wallComps && wallComps.length >= 2) ? wallComps.length : 0;
        const slots = Math.max(sorted.length, wallSlots);

        // Mixed mode: show resolved color as solid overlay
        if (this._getColorMode() === 'mixed') {
            if (sorted.length < 2) return;
            const resolved = PuzzleManager.resolveColor(components);
            if (resolved === 'WHITE') return;
            const hex = this._getWallColorHex(resolved);
            const num = parseInt(hex.replace('#', ''), 16);
            graphics.fillStyle(num, 1);
            graphics.fillRect(-s, -s, s * 2, s * 2);
            return;
        }

        // Diagonal mode
        // 1 sheep component = solid fill, 2+ = diagonal split
        if (sorted.length === 1) {
            const c = parseInt(this._getWallColorHex(sorted[0]).replace('#', ''), 16);
            graphics.fillStyle(c, 1);
            graphics.fillRect(-s, -s, s * 2, s * 2);
            return;
        }

        // Determine actual slots needed: union of wall comps and sheep comps
        const allComps = new Set(sorted);
        if (wallComps) wallComps.forEach(c => allComps.add(c));
        const actualSlots = Math.max(slots, allComps.size);

        if (actualSlots < 2) return;

        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(-s, -s, s * 2, s * 2);

        if (actualSlots >= 3) {
            const t = s * 0.45;
            if (sorted.includes('RED')) {
                const c = parseInt(this._getWallColorHex('RED').replace('#', ''), 16);
                graphics.fillStyle(c, 1);
                graphics.fillTriangle(-s, -s, t, -s, -s, t);
            }
            if (sorted.includes('YELLOW')) {
                const c = parseInt(this._getWallColorHex('YELLOW').replace('#', ''), 16);
                graphics.fillStyle(c, 1);
                graphics.beginPath();
                graphics.moveTo(t, -s);
                graphics.lineTo(s, -s);
                graphics.lineTo(s, -t);
                graphics.lineTo(-t, s);
                graphics.lineTo(-s, s);
                graphics.lineTo(-s, t);
                graphics.closePath();
                graphics.fillPath();
            }
            if (sorted.includes('BLUE')) {
                const c = parseInt(this._getWallColorHex('BLUE').replace('#', ''), 16);
                graphics.fillStyle(c, 1);
                graphics.fillTriangle(s, -t, s, s, -t, s);
            }
        } else if (actualSlots === 2) {
            // Build slot order from union of wall and sheep comps
            const slotOrder = order.filter(c => allComps.has(c));
            for (let i = 0; i < slotOrder.length; i++) {
                if (!sorted.includes(slotOrder[i])) continue;
                const c = parseInt(this._getWallColorHex(slotOrder[i]).replace('#', ''), 16);
                graphics.fillStyle(c, 1);
                if (i === 0) {
                    graphics.fillTriangle(-s, -s, s, -s, -s, s);
                } else {
                    graphics.fillTriangle(s, -s, s, s, -s, s);
                }
            }
        }
    }

    _getWallColorHex(colorKey) {
        if (CONFIG.DISPLAY_COLORS[colorKey]) return CONFIG.DISPLAY_COLORS[colorKey];
        if (CONFIG.MIXED_COLORS[colorKey]) return CONFIG.MIXED_COLORS[colorKey].hex;
        return '#FFFFFF';
    }

    _drawRainbowWall(graphics) {
        const s = this.cellSize;
        const colors = [0x00BCD4, 0xE91E63, 0xFFEB3B, 0x2979FF, 0x00C853, 0xE53935];
        const stripeH = s / colors.length;
        for (let i = 0; i < colors.length; i++) {
            graphics.fillStyle(colors[i], 0.85);
            graphics.fillRect(-s / 2, -s / 2 + i * stripeH, s, stripeH + 1);
        }
    }


    _tintSheep(image, components) {
        const resolved = PuzzleManager.resolveColor(components);
        if (resolved === 'WHITE') {
            image.clearTint();
        } else {
            const hex = this._getWallColorHex(resolved);
            const colorNum = parseInt(hex.replace('#', ''), 16);
            image.setTint(colorNum);
        }
    }

    _applySheepVisual(sheep, components, wallColor) {
        if (!components || components.length === 0) {
            sheep.clearTint();
            sheep.setAlpha(1);
        } else if (components.includes('DIRTY')) {
            sheep.setTint(0x333333);
            sheep.setAlpha(1);
        } else {
            const order = ['RED', 'YELLOW', 'BLUE'];
            const sorted = order.filter(c => components.includes(c));

            // Mixed mode: always use tint with resolved color
            if (this._getColorMode() === 'mixed') {
                const resolved = PuzzleManager.resolveColor(components);
                if (resolved === 'WHITE') {
                    sheep.clearTint();
                } else {
                    const hex = this._getWallColorHex(resolved);
                    sheep.setTint(parseInt(hex.replace('#', ''), 16));
                }
                sheep.setAlpha(1);
                return;
            }

            // Diagonal mode: use overlay for multi-color
            const wallComps = (wallColor && CONFIG.MIXED_COLORS[wallColor])
                ? CONFIG.MIXED_COLORS[wallColor].components : null;
            const allComps = new Set(sorted);
            if (wallComps) wallComps.forEach(c => allComps.add(c));
            const useOverlay = allComps.size >= 2 || sorted.length >= 2;
            if (useOverlay) {
                sheep.setAlpha(0);
            } else if (sorted.length === 1) {
                const hex = this._getWallColorHex(sorted[0]);
                sheep.setTint(parseInt(hex.replace('#', ''), 16));
                sheep.setAlpha(1);
            } else {
                sheep.clearTint();
                sheep.setAlpha(1);
            }
        }
    }

    _createPalette() {
        const { width, height } = this.scale;
        const paletteTop = height * (CONFIG.LAYOUT.HEADER_RATIO + CONFIG.LAYOUT.GRID_RATIO);
        const paletteHeight = height * CONFIG.LAYOUT.PALETTE_RATIO;

        const colors = CONFIG.PALETTE;
        const totalItems = colors.length + 1; // +1 for wash
        const btnSize = Math.min(paletteHeight - 20, 44);
        const spacing = width / (totalItems + 1);

        this.paletteButtons = [];

        for (let i = 0; i < colors.length; i++) {
            const x = spacing * (i + 1);
            const y = paletteTop + paletteHeight / 2;
            const colorKey = colors[i];
            const hex = CONFIG.DISPLAY_COLORS[colorKey] || '#FFFFFF';
            const colorNum = parseInt(hex.replace('#', ''), 16);

            const btn = this.add.graphics();
            btn.fillStyle(colorNum, 1);
            btn.fillCircle(x, y, btnSize / 2);
            btn.lineStyle(3, 0xffffff, 1);
            btn.strokeCircle(x, y, btnSize / 2);

            // Color blind icon overlay
            if (this._isColorBlind()) {
                const iconGfx = this.add.graphics();
                this._drawColorBlindIcon(iconGfx, x, y, btnSize * 0.25, colorKey);
            }

            const zone = this.add.zone(x, y, btnSize, btnSize)
                .setInteractive()
                .on('pointerdown', () => this._selectColor(colorKey));

            this.paletteButtons.push({ btn, zone, colorKey, x, y, btnSize });
        }

        // Wash button
        const hoseX = spacing * (colors.length + 1);
        const hoseY = paletteTop + paletteHeight / 2;
        const hoseBtn = this.add.graphics();
        hoseBtn.fillStyle(0xaaddff, 1);
        hoseBtn.fillCircle(hoseX, hoseY, btnSize / 2);
        hoseBtn.lineStyle(3, 0xffffff, 1);
        hoseBtn.strokeCircle(hoseX, hoseY, btnSize / 2);

        this.add.text(hoseX, hoseY, '💧', { fontSize: '20px' }).setOrigin(0.5);

        const hoseZone = this.add.zone(hoseX, hoseY, btnSize, btnSize)
            .setInteractive()
            .on('pointerdown', () => this._selectWash());

        this.paletteButtons.push({ btn: hoseBtn, zone: hoseZone, colorKey: 'WASH', x: hoseX, y: hoseY, btnSize });

        this.selectionIndicator = this.add.graphics();
    }

    _selectColor(colorKey) {
        this._wakeLoop();
        if (this._isTutorialBlocked('selectColor', { color: colorKey })) return;
        if (this.selectedColor === colorKey && !this.isWashMode) {
            this.selectedColor = null;
            this._updatePaletteSelection();
            this._updateNeedHighlight();
            return;
        }
        this.selectedColor = colorKey;
        this.isWashMode = false;
        this._updatePaletteSelection();
        this._updateNeedHighlight();
        this._checkTutorialCondition('selectColor', { color: colorKey });
    }

    _selectWash() {
        this._wakeLoop();
        if (this._isTutorialBlocked('selectColor', { color: 'WASH' })) return;
        if (this.isWashMode) {
            this.isWashMode = false;
            this._updatePaletteSelection();
            this._updateNeedHighlight();
            return;
        }
        this.selectedColor = null;
        this.isWashMode = true;
        this._updatePaletteSelection();
        this._updateNeedHighlight();
        this._checkTutorialCondition('selectColor', { color: 'WASH' });
    }

    _updatePaletteSelection() {
        this.selectionIndicator.clear();
        for (const pb of this.paletteButtons) {
            const isSelected = (this.isWashMode && pb.colorKey === 'WASH') ||
                               (!this.isWashMode && pb.colorKey === this.selectedColor);
            if (isSelected) {
                this.selectionIndicator.lineStyle(4, 0xffaa00, 1);
                this.selectionIndicator.strokeCircle(pb.x, pb.y, pb.btnSize / 2 + 4);
            }
        }
    }

    _updateNeedHighlight(keepCells) {
        if (this.needHighlights) {
            this.needHighlights.forEach(h => {
                if (keepCells && keepCells.has(h)) return;
                h.destroy();
            });
        }
        this.needHighlights = [];

        for (let row = 0; row < this.puzzle.rows; row++) {
            for (let col = 0; col < this.puzzle.cols; col++) {
                const cell = this.puzzle.grid[row][col];
                if (!cell || !cell.alive) continue;

                let needs = false;

                if (this.isWashMode) {
                    // Dirty cells (need wash) or cells with wrong components
                    if (cell.type === 'dirty' && cell.sheepComponents.includes('DIRTY')) {
                        needs = true;
                    } else if (cell.sheepComponents.length > 0 && cell.type !== 'dirty') {
                        const resolved = PuzzleManager.resolveColor(cell.sheepComponents);
                        if (cell.type === 'rainbow') {
                            needs = false; // rainbow just needs any color
                        } else {
                            const target = CONFIG.MIXED_COLORS[cell.wallColor];
                            if (target) {
                                // Has components that aren't part of the target
                                const hasWrong = cell.sheepComponents.some(c => !target.components.includes(c));
                                if (hasWrong) needs = true;
                            }
                        }
                    }
                } else if (this.selectedColor) {
                    // Cells that need this component
                    if (cell.type === 'dirty' || cell.type === 'rainbow') {
                        if (cell.type === 'rainbow' && cell.sheepComponents.length === 0) {
                            needs = true;
                        }
                    } else {
                        const target = CONFIG.MIXED_COLORS[cell.wallColor];
                        if (target && target.components.includes(this.selectedColor) && !cell.sheepComponents.includes(this.selectedColor)) {
                            needs = true;
                        }
                    }
                }

                if (needs) {
                    const view = this.blockViews[row][col];
                    if (!view || !view.container) continue;
                    const sheepH = this.cellSize * 0.7;
                    const sheepImg = this.textures.get('sheep').getSourceImage();
                    const sheepScale = sheepH / sheepImg.height;
                    const sheepW = sheepImg.width * sheepScale;
                    const sg = this.add.image(0, 0, 'sunglasses').setDisplaySize(sheepW, sheepH);
                    view.container.add(sg);
                    this.needHighlights.push(sg);
                }
            }
        }
    }



    _setupDragInput() {
        const { height } = this.scale;
        const gridBottom = height * (CONFIG.LAYOUT.HEADER_RATIO + CONFIG.LAYOUT.GRID_RATIO);

        this.input.on('pointerdown', (pointer) => {
            this._wakeLoop();
            if (this.isAnimating) return;
            if (pointer.y > gridBottom) return;

            if (this.itemMode) {
                this._handleItemTap(pointer);
                return;
            }

            const cell = this._pointerToCell(pointer);
            if (cell === null) return;

            if (!this.selectedColor && !this.isWashMode) {
                this._showToast('색상을 먼저 선택해주세요');
                return;
            }

            this.isDragging = true;
            this.dragPath = [cell];
            this._updateDragPreview();
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.isDragging) return;

            const cell = this._pointerToCell(pointer);
            if (cell === null) {
                if (this._isOutsideGrid(pointer) || this._isOnDeadCell(pointer)) {
                    this.isDragging = false;
                    this.dragPath = [];
                    this._clearDragPreview();
                }
                return;
            }

            const lastCell = this.dragPath[this.dragPath.length - 1];
            if (cell.row === lastCell.row && cell.col === lastCell.col) return;

            // Check if revisiting any cell already in path — trim to that point
            const existingIdx = this.dragPath.findIndex(p => p.row === cell.row && p.col === cell.col);
            if (existingIdx !== -1) {
                this.dragPath = this.dragPath.slice(0, existingIdx + 1);
                this._updateDragPreview();
                return;
            }

            // Check adjacency (orthogonal or diagonal based on setting)
            const dr = cell.row - lastCell.row;
            const dc = cell.col - lastCell.col;
            const diagEnabled = false;
            const isAdjacent = diagEnabled
                ? (Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && (dr !== 0 || dc !== 0))
                : (Math.abs(dr) + Math.abs(dc) === 1);
            if (!isAdjacent) {
                return;
            }

            this.dragPath.push(cell);
            this._updateDragPreview();
        });

        this.input.on('pointerup', (pointer) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this._clearDragPreview();
            if (this._isOutsideGrid(pointer)) {
                this.dragPath = [];
            } else {
                this._executeDrag();
            }
        });

        this.input.on('gameout', () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.dragPath = [];
            this._clearDragPreview();
        });

        if (this._boundTouchEnd) {
            this.game.canvas.removeEventListener('touchend', this._boundTouchEnd);
            this.game.canvas.removeEventListener('touchcancel', this._boundTouchCancel);
        }
        this._boundTouchEnd = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this._clearDragPreview();
            if (e.changedTouches && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const rect = this.game.canvas.getBoundingClientRect();
                const x = (touch.clientX - rect.left) * (this.game.canvas.width / rect.width);
                const y = (touch.clientY - rect.top) * (this.game.canvas.height / rect.height);
                if (this._isOutsideGrid({ x, y })) {
                    this.dragPath = [];
                    return;
                }
            }
            this._executeDrag();
        };
        this._boundTouchCancel = () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.dragPath = [];
            this._clearDragPreview();
        };
        this.game.canvas.addEventListener('touchend', this._boundTouchEnd);
        this.game.canvas.addEventListener('touchcancel', this._boundTouchCancel);
    }

    _pointerToCell(pointer) {
        const step = this.cellSize + this.gridPadding;
        const col = Math.floor((pointer.x - this.gridOffsetX) / step);
        const row = Math.floor((pointer.y - this.gridOffsetY) / step);

        if (row < 0 || row >= this.puzzle.rows || col < 0 || col >= this.puzzle.cols) return null;

        // 대각선 이동 시 셀 중심 90% 영역만 진입 감지
        if (false) {
            const cellLocalX = (pointer.x - this.gridOffsetX) - col * step;
            const cellLocalY = (pointer.y - this.gridOffsetY) - row * step;
            const margin = this.cellSize * 0.025;
            if (cellLocalX < margin || cellLocalX > this.cellSize - margin ||
                cellLocalY < margin || cellLocalY > this.cellSize - margin) {
                return null;
            }
        }

        const cell = this.puzzle.grid[row][col];
        if (!cell || !cell.alive) return null;

        return { row, col };
    }

    _pointerToCellRaw(pointer) {
        const step = this.cellSize + this.gridPadding;
        const col = Math.floor((pointer.x - this.gridOffsetX) / step);
        const row = Math.floor((pointer.y - this.gridOffsetY) / step);
        if (row < 0 || row >= this.puzzle.rows || col < 0 || col >= this.puzzle.cols) return null;
        return { row, col };
    }

    _isOutsideGrid(pointer) {
        const totalW = this.puzzle.cols * (this.cellSize + this.gridPadding) - this.gridPadding;
        const totalH = this.puzzle.rows * (this.cellSize + this.gridPadding) - this.gridPadding;
        const margin = this.cellSize * 0.5;
        return pointer.x < this.gridOffsetX - margin ||
               pointer.x > this.gridOffsetX + totalW + margin ||
               pointer.y < this.gridOffsetY - margin ||
               pointer.y > this.gridOffsetY + totalH + margin;
    }

    _isOnDeadCell(pointer) {
        const rawCell = this._pointerToCellRaw(pointer);
        if (!rawCell) return false;
        const cell = this.puzzle.grid[rawCell.row][rawCell.col];
        return !cell || !cell.alive;
    }

    _updateDragPreview() {
        this._clearDragPreview();
        if (!this.dragHighlights) this.dragHighlights = [];

        for (const { row, col } of this.dragPath) {
            const view = this.blockViews[row][col];
            if (!view || !view.container || !view.sheepOverlay) continue;
            const cell = this.puzzle.grid[row][col];
            if (!cell || !cell.alive) continue;

            let previewComponents;
            if (this.isWashMode) {
                previewComponents = [];
            } else if (cell.sheepComponents.includes(this.selectedColor)) {
                previewComponents = [...cell.sheepComponents];
            } else {
                previewComponents = [...cell.sheepComponents, this.selectedColor];
            }
            this._applySheepVisual(view.sheep, previewComponents, cell.wallColor);
            this._drawSheepDiagonal(view.sheepOverlay, previewComponents, view.sheepW, view.sheepH, cell.wallColor);
            view._originalComponents = cell.sheepComponents;
            this.dragHighlights.push({ row, col });
        }
    }

    _clearDragPreview() {
        if (this.dragHighlights) {
            for (const { row, col } of this.dragHighlights) {
                const view = this.blockViews[row][col];
                if (view && view.sheepOverlay && view._originalComponents !== undefined) {
                    const cell = this.puzzle.grid[row][col];
                    this._applySheepVisual(view.sheep, view._originalComponents, cell ? cell.wallColor : null);
                    this._drawSheepDiagonal(view.sheepOverlay, view._originalComponents, view.sheepW, view.sheepH, cell ? cell.wallColor : null);
                    delete view._originalComponents;
                }
            }
            this.dragHighlights = [];
        }
    }

    _executeDrag() {
        if (this.dragPath.length === 0) return;

        const dragEventType = this.isWashMode ? 'wash' : 'paint';
        if (this._isTutorialBlocked(dragEventType, {})) return;

        if (this._isTutorialDragRestricted()) {
            this._showToast('한 번에 하이라이트 된 칸을 모두 드래그하세요');
            return;
        }

        if (this.isMegaStage) this._megaScoreHistory.push(this.megaScore);

        if (this.isWashMode) {
            const result = this.puzzle.washPath(this.dragPath);
            if (result) {
                if (this._shouldRollbackTutorial('wash', { cells: this.dragPath })) {
                    this.puzzle.undoLastMove();
                    this._rebuildGrid();
                    if (this.isMegaStage) this._megaScoreHistory.pop();
                    this._showToast('튜토리얼을 완료해주세요');
                    return;
                }
                this._clearTutorialHighlight();
                this._animateWash(result.washed, result.cleared);
                this._pendingTutorialCheck = { type: 'wash', detail: { cells: [...this.dragPath] } };
            } else {
                if (this.isMegaStage) this._megaScoreHistory.pop();
            }
        } else {
            const result = this.puzzle.paintPath(this.dragPath, this.selectedColor);
            if (result) {
                if (this._shouldRollbackTutorial('paint', { cells: this.dragPath })) {
                    this.puzzle.undoLastMove();
                    this._rebuildGrid();
                    if (this.isMegaStage) this._megaScoreHistory.pop();
                    this._showToast('튜토리얼을 완료해주세요');
                    return;
                }
                this._clearTutorialHighlight();
                this._animatePaint(result.painted, result.cleared);
                this._pendingTutorialCheck = { type: 'paint', detail: { cells: [...this.dragPath] } };
            } else {
                if (this.isMegaStage) this._megaScoreHistory.pop();
            }
        }

        this._updateMovesText();
        const keep = new Set();
        if (this.needHighlights) {
            for (const h of this.needHighlights) {
                if (h.parentContainer) {
                    const cont = h.parentContainer;
                    const view = this.blockViews.flat().find(v => v && v.container === cont);
                    if (view) {
                        const cell = this.puzzle.grid[view.row][view.col];
                        if (cell && !cell.alive) keep.add(h);
                    }
                }
            }
        }
        this._updateNeedHighlight(keep);
    }

    _isTutorialDragRestricted() {
        if (!this.tutorialSteps) return false;
        if (this.tutorialStepIndex >= this.tutorialSteps.length) return false;

        const step = this.tutorialSteps[this.tutorialStepIndex];
        const cond = step.condition;
        if (!cond) return false;
        if ((cond.type !== 'paint' && cond.type !== 'wash') || !cond.cells) return false;

        const required = new Set(cond.cells.map(c => `${c[0]},${c[1]}`));
        const dragged = new Set(this.dragPath.map(c => `${c.row},${c.col}`));
        return ![...required].every(k => dragged.has(k));
    }

    _shouldRollbackTutorial(eventType, detail) {
        if (!this.tutorialSteps) return false;
        if (this.tutorialStepIndex >= this.tutorialSteps.length) return false;

        const cond = this.tutorialSteps[this.tutorialStepIndex].condition;
        if (!cond) return false;
        if (cond.type === 'clear') return false;
        if (cond.type !== eventType) return true;

        if (cond.cells) {
            const required = new Set(cond.cells.map(c => `${c[0]},${c[1]}`));
            const acted = new Set((detail.cells || []).map(c => `${c.row},${c.col}`));
            if (![...required].every(k => acted.has(k))) return true;
        }
        return false;
    }

    _animatePaint(painted, cleared) {
        for (const p of painted) {
            const view = this.blockViews[p.row][p.col];
            const cell = this.puzzle.grid[p.row][p.col];
            if (p.maskedConsumed) {
                this._drawMaskOverlay(view, false);
                this.tweens.add({
                    targets: view.container,
                    scaleX: 1.05, scaleY: 1.05,
                    duration: 80, yoyo: true
                });
            } else if (view.sheepOverlay) {
                this._applySheepVisual(view.sheep, cell.sheepComponents, cell.wallColor);
                this._drawSheepDiagonal(view.sheepOverlay, cell.sheepComponents, view.sheepW, view.sheepH, cell.wallColor);
                this.tweens.add({
                    targets: view.container,
                    scaleX: 1.1, scaleY: 1.1,
                    duration: 100, yoyo: true
                });
            }
        }

        if (cleared.length > 0) {
            this.isAnimating = true;
            this.time.delayedCall(200, () => {
                this._animateClear(cleared);
            });
        } else {
            this._flushPendingTutorialCheck();
            this._checkEndConditions();
        }
    }

    _animateWash(washed, cleared) {
        for (const w of washed) {
            const view = this.blockViews[w.row][w.col];
            const cell = this.puzzle.grid[w.row][w.col];
            if (view.sheepOverlay) {
                this._applySheepVisual(view.sheep, [], cell ? cell.wallColor : null);
                this._drawSheepDiagonal(view.sheepOverlay, [], view.sheepW, view.sheepH, cell ? cell.wallColor : null);
                this.tweens.add({
                    targets: view.container,
                    scaleX: 1.05, scaleY: 1.05,
                    duration: 80, yoyo: true
                });
            }
        }

        if (cleared && cleared.length > 0) {
            this.isAnimating = true;
            this.time.delayedCall(200, () => {
                this._animateClear(cleared);
            });
        } else {
            this._flushPendingTutorialCheck();
            this._checkEndConditions();
        }
    }

    _animateClear(cleared) {
        if (this.isMegaStage && cleared.length > 0) {
            const n = cleared.length;
            this.megaScore += n * (30 + n);
            this.scoreText.setText(`점수: ${this.megaScore}`);
        }
        let completed = 0;
        for (const c of cleared) {
            const view = this.blockViews[c.row][c.col];
            const cx = view.container.x;
            const cy = view.container.y;

            if (view.sheepMask) {
                this.tweens.add({
                    targets: view.sheepMask,
                    x: cx, y: cy,
                    scaleX: 0, scaleY: 0, alpha: 0,
                    duration: 300,
                    ease: 'Back.easeIn',
                });
            }
            if (view.wallMaskGfx) {
                this.tweens.add({
                    targets: view.wallMaskGfx,
                    scaleX: 0, scaleY: 0, alpha: 0,
                    duration: 300,
                    ease: 'Back.easeIn',
                });
            }

            this.tweens.add({
                targets: view.container,
                scaleX: 0, scaleY: 0, alpha: 0,
                duration: 300,
                ease: 'Back.easeIn',
                onComplete: () => {
                    if (view.sheepMask) { view.sheepMask.destroy(); view.sheepMask = null; }
                    if (view.wallMaskGfx) { view.wallMaskGfx.destroy(); view.wallMaskGfx = null; }
                    if (view.container) { view.container.destroy(); view.container = null; }
                    completed++;
                    if (completed >= cleared.length) {
                        this._doGravity();
                    }
                }
            });
        }
    }

    _doGravity() {
        const { fallen, fallenPlanks } = this.puzzle.applyGravity();

        if (fallen.length === 0 && fallenPlanks.length === 0) {
            this._rebuildGrid();
            this._updateNeedHighlight();
            this._flushPendingTutorialCheck();
            this.isAnimating = false;
            this._checkEndConditions();
            return;
        }

        const totalAnimations = fallen.length + fallenPlanks.length;
        let completed = 0;
        const onAnimComplete = () => {
            completed++;
            if (completed >= totalAnimations) {
                this._afterGravity();
            }
        };

        // Animate blocks
        for (const f of fallen) {
            const view = this.blockViews[f.fromRow][f.col];
            const targetY = this.gridOffsetY + f.toRow * (this.cellSize + this.gridPadding) + this.cellSize / 2;

            if (view.wallMaskGfx) {
                this.tweens.add({
                    targets: view.wallMaskGfx,
                    y: targetY,
                    duration: 200,
                    ease: 'Bounce.easeOut',
                });
            }
            if (view.sheepMask) {
                this.tweens.add({
                    targets: view.sheepMask,
                    y: targetY,
                    duration: 200,
                    ease: 'Bounce.easeOut',
                });
            }
            this.tweens.add({
                targets: view.container,
                y: targetY,
                duration: 200,
                ease: 'Bounce.easeOut',
                onComplete: onAnimComplete,
            });
        }

        // Animate planks
        for (const fp of fallenPlanks) {
            const fromY = this.gridOffsetY + fp.fromRow * (this.cellSize + this.gridPadding) + this.cellSize + 1;
            const toY = this.gridOffsetY + fp.toRow * (this.cellSize + this.gridPadding) + this.cellSize + 1;

            const plankGfx = this.add.graphics();
            this._drawPlankWithHoles(plankGfx, { ...fp, row: fp.fromRow });

            this.tweens.add({
                targets: plankGfx,
                y: toY - fromY,
                duration: 200,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                    plankGfx.destroy();
                    onAnimComplete();
                },
            });
        }

        // Hide static plank drawing only when planks are actually moving
        if (fallenPlanks.length > 0 && this.plankGfx) this.plankGfx.setVisible(false);
    }

    _afterGravity() {
        // Check for new clears after gravity
        const cleared = this.puzzle._checkAllCleared();
        if (cleared.length > 0) {
            this._rebuildGrid();
            this._updateNeedHighlight();
            this.time.delayedCall(150, () => {
                this._animateClear(cleared);
            });
        } else {
            this._rebuildGrid();
            this._updateNeedHighlight();
            this._flushPendingTutorialCheck();
            this.isAnimating = false;
            this._checkEndConditions();
        }
    }

    _flushPendingTutorialCheck() {
        if (this._pendingTutorialCheck) {
            const { type, detail } = this._pendingTutorialCheck;
            this._pendingTutorialCheck = null;
            this._checkTutorialCondition(type, detail);
        }
    }

    _rebuildGrid() {
        for (let row = 0; row < this.puzzle.rows; row++) {
            for (let col = 0; col < this.puzzle.cols; col++) {
                const oldView = this.blockViews[row][col];
                if (oldView) {
                    if (oldView.sheepMask) oldView.sheepMask.destroy();
                    if (oldView.wallMaskGfx) oldView.wallMaskGfx.destroy();
                    if (oldView.container) oldView.container.destroy();
                }
            }
        }

        this.blockViews = [];
        for (let row = 0; row < this.puzzle.rows; row++) {
            const rowViews = [];
            for (let col = 0; col < this.puzzle.cols; col++) {
                const cell = this.puzzle.grid[row][col];
                const view = this._createBlockView(row, col, cell);
                rowViews.push(view);
            }
            this.blockViews.push(rowViews);
        }

        this._drawPlanks();
    }

    _updateMovesText() {
        this.movesText.setText(`남은 턴: ${this.puzzle.movesLeft}`);
    }

    _checkEndConditions() {
        this._wakeLoop();
        if (this.puzzle.isCleared()) {
            this.isAnimating = true;
            this._checkTutorialCondition('clear', {});
            this.time.delayedCall(500, () => {
                if (this._testData) {
                    this.scene.start('MapEditorScene', {
                        level: this.currentLevel,
                        puzzle: this.puzzle,
                        rows: this.puzzle.rows,
                        cols: this.puzzle.cols,
                        stageNum: this._testStageNum
                    });
                    return;
                }
                if (this.isMegaStage) {
                    this._animateTurnBonus();
                    return;
                }
                const remaining = this.puzzle.totalBlocks - this.puzzle.clearedBlocks;
                this.scene.start('GameOverScene', {
                    cleared: true,
                    remainingSheep: remaining,
                    level: this.currentLevel,
                    retryPuzzle: this.puzzle,
                    isTutorial: !!this.puzzle.tutorialData
                });
            });
        } else if (this.puzzle.isGameOver()) {
            this.isAnimating = true;
            this.time.delayedCall(500, () => {
                const remaining = this.puzzle.totalBlocks - this.puzzle.clearedBlocks;
                this.scene.start('GameOverScene', {
                    cleared: false,
                    remainingSheep: remaining,
                    level: this.currentLevel,
                    retryPuzzle: this.puzzle,
                    isMegaStage: this.isMegaStage,
                    megaScore: this.megaScore,
                    megaMovesUsed: this.puzzle.initialMovesLeft - this.puzzle.movesLeft,
                    megaMovesLeft: this.puzzle.movesLeft
                });
            });
        }
    }

    _animateTurnBonus() {
        const turnsLeft = this.puzzle.movesLeft;
        const movesUsed = this.puzzle.initialMovesLeft - this.puzzle.movesLeft;
        if (turnsLeft <= 0) {
            this.scene.start('GameOverScene', {
                cleared: true,
                remainingSheep: 0,
                level: this.currentLevel,
                retryPuzzle: this.puzzle,
                isMegaStage: true,
                megaScore: this.megaScore,
                megaMovesUsed: movesUsed,
                megaMovesLeft: 0
            });
            return;
        }

        let remaining = turnsLeft;
        const timer = this.time.addEvent({
            delay: 80,
            repeat: turnsLeft - 1,
            callback: () => {
                remaining--;
                this.megaScore += 1000;
                this.movesText.setText(`남은 턴: ${remaining}`);
                this.scoreText.setText(`점수: ${this.megaScore}`);
            },
            callbackScope: this
        });

        this.time.delayedCall(80 * turnsLeft + 400, () => {
            this.scene.start('GameOverScene', {
                cleared: true,
                remainingSheep: 0,
                level: this.currentLevel,
                retryPuzzle: this.puzzle,
                isMegaStage: true,
                megaScore: this.megaScore,
                megaMovesUsed: movesUsed,
                megaMovesLeft: turnsLeft
            });
        });
    }

    _createItemSlots() {
        const { width, height } = this.scale;
        const itemTop = height * (1 - CONFIG.LAYOUT.ITEM_RATIO);
        const itemHeight = height * CONFIG.LAYOUT.ITEM_RATIO;
        const btnSize = Math.min(itemHeight - 16, 46);
        const spacing = width / (CONFIG.ITEM_SLOTS + 1);

        this.itemButtons = [];

        const items = [
            { icon: '↩', label: 'undo', bgColor: 0xf8e8c8, borderColor: 0xe0c090, textColor: '#8B6914', image: null },
            { icon: null, label: 'mask', bgColor: 0xe0f0ff, borderColor: 0x90b8d8, textColor: '#8B6914', image: 'tape' },
            { icon: '🐕', label: 'herd', bgColor: 0xfff3e0, borderColor: 0xd4a060, textColor: '#5D4037', image: null },
            { icon: null, label: 'singlePaint', bgColor: 0xe8f0e8, borderColor: 0x90c090, textColor: '#2d6b2d', image: 'paint' },
        ];

        for (let i = 0; i < CONFIG.ITEM_SLOTS; i++) {
            const x = spacing * (i + 1);
            const y = itemTop + itemHeight / 2;
            const item = items[i];

            const btn = this.add.graphics();
            btn.fillStyle(item.bgColor, 1);
            btn.fillRoundedRect(x - btnSize / 2, y - btnSize / 2, btnSize, btnSize, 10);
            btn.lineStyle(2, item.borderColor, 1);
            btn.strokeRoundedRect(x - btnSize / 2, y - btnSize / 2, btnSize, btnSize, 10);

            if (item.image) {
                const img = this.add.image(x, y, item.image);
                img.setDisplaySize(btnSize * 0.6, btnSize * 0.6);
            } else {
                this.add.text(x, y, item.icon, {
                    fontSize: '24px', color: item.textColor, fontFamily: 'Jua'
                }).setOrigin(0.5);
            }

            const zone = this.add.zone(x, y, btnSize, btnSize)
                .setInteractive()
                .on('pointerdown', () => this._onItemPress(item.label));

            this.itemButtons.push({ btn, zone, x, y, btnSize, label: item.label });
        }

        this.itemIndicator = this.add.graphics();
    }

    _onItemPress(label) {
        this._wakeLoop();
        if (this.isAnimating) return;

        if (label === 'undo') {
            if (this._isTutorialBlocked('useItem', { item: 'undo' })) return;
            this._undoLastMove();
            return;
        }

        if (label === 'herd') {
            if (this._isTutorialBlocked('selectItem', { item: 'herd' })) return;
            this.itemMode = 'herd';
            this.selectedColor = null;
            this.isWashMode = false;
            this._updatePaletteSelection();
            this._updateNeedHighlight();
            this._updateItemSelection();
            this._checkTutorialCondition('selectItem', { item: 'herd' });
            this._showHerdDirectionUI();
            return;
        }

        if (this._isTutorialBlocked('selectItem', { item: label })) return;

        if (this.itemMode === label) {
            this.itemMode = null;
        } else {
            this.itemMode = label;
            this.selectedColor = null;
            this.isWashMode = false;
            this._updatePaletteSelection();
            this._updateNeedHighlight();
        }
        this._updateItemSelection();
        this._checkTutorialCondition('selectItem', { item: label });
    }

    _updateItemSelection() {
        this.itemIndicator.clear();
        if (this._itemDescText) { this._itemDescText.destroy(); this._itemDescText = null; }

        for (const ib of this.itemButtons) {
            if (ib.label === this.itemMode) {
                this.itemIndicator.lineStyle(3, 0xff6600, 1);
                this.itemIndicator.strokeRoundedRect(
                    ib.x - ib.btnSize / 2 - 3, ib.y - ib.btnSize / 2 - 3,
                    ib.btnSize + 6, ib.btnSize + 6, 12
                );
            }
        }

        if (this.itemMode) {
            const descs = {
                singlePaint: '선택한 양 한 마리를 벽 색으로 칠합니다',
                mask: '선택한 양이 한 번 색칠되는 것을 막아줍니다',
                herd: '양들을 원하는 방향으로 밀착시킵니다',
            };
            const desc = descs[this.itemMode];
            if (desc) {
                const { width } = this.scale;
                const btnTop = this.itemButtons[0].y - this.itemButtons[0].btnSize / 2;
                this._itemDescText = this.add.text(width / 2, btnTop - 12, desc, {
                    fontSize: '13px', color: '#555', fontFamily: 'Jua'
                }).setOrigin(0.5, 1);
            }
        }
    }

    _handleItemTap(pointer) {
        const cell = this._pointerToCell(pointer);
        if (!cell) {
            this.itemMode = null;
            this._updateItemSelection();
            return;
        }

        if (this.itemMode === 'singlePaint') {
            const result = this.puzzle.paintSingleCell(cell.row, cell.col);
            if (result) {
                this._checkTutorialCondition('useItem', { item: 'singlePaint' });
                this.isAnimating = true;
                const view = this.blockViews[cell.row][cell.col];
                const gridCell = this.puzzle.grid[cell.row][cell.col];
                if (view && view.sheepOverlay) {
                    this._applySheepVisual(view.sheep, gridCell.sheepComponents, gridCell.wallColor);
                    this._drawSheepDiagonal(view.sheepOverlay, gridCell.sheepComponents, view.sheepW, view.sheepH, gridCell.wallColor);
                    this.tweens.add({
                        targets: view.container,
                        scaleX: 1.15, scaleY: 1.15,
                        duration: 150, yoyo: true,
                        onComplete: () => {
                            if (result.cleared.length > 0) {
                                this._animateClear(result.cleared);
                            } else {
                                this.isAnimating = false;
                                this._checkEndConditions();
                            }
                        }
                    });
                } else {
                    if (result.cleared.length > 0) {
                        this._rebuildGrid();
                        this.time.delayedCall(200, () => this._animateClear(result.cleared));
                    } else {
                        this._rebuildGrid();
                        this.isAnimating = false;
                        this._checkEndConditions();
                    }
                }
            }
            this.itemMode = null;
            this._updateItemSelection();

        } else if (this.itemMode === 'mask') {
            const targetCell = this.puzzle.grid[cell.row][cell.col];
            const success = this.puzzle.applyMask(cell.row, cell.col);
            if (success) {
                this._checkTutorialCondition('useItem', { item: 'mask' });
                this._rebuildGrid();
            }
            this.itemMode = null;
            this._updateItemSelection();
        }
    }

    _showHerdDirectionUI() {
        if (this._herdUI) this._destroyHerdUI();

        const { width, height } = this.scale;
        const cy = this.gridTop + this.gridHeight / 2;
        const btnW = 100;
        const btnH = 50;

        const overlay = this.add.graphics().setDepth(2000);
        overlay.fillStyle(0x000000, 0.4);
        overlay.fillRect(0, 0, width, height);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', () => this._destroyHerdUI());

        const leftBtn = this.add.graphics().setDepth(2001);
        leftBtn.fillStyle(0x4CAF50, 1);
        leftBtn.fillRoundedRect(width / 2 - btnW - 20, cy - btnH / 2, btnW, btnH, 12);

        const leftText = this.add.text(width / 2 - btnW / 2 - 20, cy, '← 왼쪽', {
            fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(2001);

        const leftZone = this.add.zone(width / 2 - btnW / 2 - 20, cy, btnW, btnH)
            .setInteractive().setDepth(2002)
            .on('pointerdown', () => this._executeHerd('left'));

        const rightBtn = this.add.graphics().setDepth(2001);
        rightBtn.fillStyle(0x2196F3, 1);
        rightBtn.fillRoundedRect(width / 2 + 20, cy - btnH / 2, btnW, btnH, 12);

        const rightText = this.add.text(width / 2 + btnW / 2 + 20, cy, '오른쪽 →', {
            fontSize: '18px', color: '#fff', fontFamily: 'Jua', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(2001);

        const rightZone = this.add.zone(width / 2 + btnW / 2 + 20, cy, btnW, btnH)
            .setInteractive().setDepth(2002)
            .on('pointerdown', () => this._executeHerd('right'));

        this._herdUIElements = [overlay, leftBtn, leftText, leftZone, rightBtn, rightText, rightZone];
    }

    _destroyHerdUI() {
        if (this._herdUIElements) {
            for (const el of this._herdUIElements) el.destroy();
            this._herdUIElements = null;
        }
        this.itemMode = null;
        this._updateItemSelection();
    }

    _executeHerd(direction) {
        this._destroyHerdUI();
        this.puzzle.herdSheep(direction);
        this._rebuildGrid();
        this._updateNeedHighlight();
        this._checkTutorialCondition('useItem', { item: 'herd' });
        this._checkEndConditions();
    }

    _drawMaskOverlay(view, show) {
        if (show) {
            if (view.maskOverlay) return;
            const mask = this.add.graphics();
            mask.fillStyle(0xffeeaa, 0.6);
            mask.fillRoundedRect(-this.cellSize / 2 + 2, -this.cellSize / 2 + 2, this.cellSize - 4, this.cellSize - 4, 10);
            mask.lineStyle(2, 0xccaa00, 0.8);
            for (let dx = -this.cellSize / 2 + 4; dx < this.cellSize / 2 - 4; dx += 8) {
                mask.strokeRect(dx, -1, 6, 2);
            }
            view.container.add(mask);
            view.maskOverlay = mask;
        } else {
            if (view.maskOverlay) {
                view.maskOverlay.destroy();
                view.maskOverlay = null;
            }
        }
    }

    _showToast(message) {
        if (this._toastText) this._toastText.destroy();

        const { width } = this.scale;
        this._toastText = this.add.text(width / 2, this.gridTop + this.gridHeight / 2, message, {
            fontSize: '16px', color: '#fff', fontFamily: 'Jua',
            backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: this._toastText,
            alpha: 0,
            delay: 1000,
            duration: 500,
            onComplete: () => { if (this._toastText) this._toastText.destroy(); this._toastText = null; }
        });
    }

    _createDebugUI() {
        const { width } = this.scale;
        this.add.text(width - 10, 10, '>>>', {
            fontSize: '14px', color: '#fff', backgroundColor: '#666',
            padding: { x: 6, y: 4 }
        }).setOrigin(1, 0).setInteractive()
          .on('pointerdown', () => this.scene.start('GameScene', { level: this.currentLevel + 1 }));

        this.add.text(width - 50, 10, '📖', {
            fontSize: '14px', color: '#fff', backgroundColor: '#8E24AA',
            padding: { x: 6, y: 4 }
        }).setOrigin(1, 0).setInteractive()
          .on('pointerdown', () => this.scene.start('SolutionScene', { puzzle: this.puzzle, level: this.currentLevel }));

        this.add.text(width - 90, 10, '🔄', {
            fontSize: '14px', color: '#fff', backgroundColor: '#e74c3c',
            padding: { x: 6, y: 4 }
        }).setOrigin(1, 0).setInteractive()
          .on('pointerdown', () => {
              this.puzzle.reset();
              this.scene.start('GameScene', { level: this.currentLevel, retryPuzzle: this.puzzle });
          });

        this.colorGuideBtn = this.add.text(width - 130, 10, '🎨', {
            fontSize: '14px', color: '#fff', backgroundColor: '#2E7D32',
            padding: { x: 6, y: 4 }
        }).setOrigin(1, 0).setInteractive()
          .on('pointerdown', () => {
              this._checkTutorialCondition('openColorGuide', {});
              this.scene.start('ColorGuideScene', { puzzle: this.puzzle, level: this.currentLevel });
          });

        this.add.text(width - 170, 10, '🗺', {
            fontSize: '14px', color: '#fff', backgroundColor: '#FF6F00',
            padding: { x: 6, y: 4 }
        }).setOrigin(1, 0).setInteractive()
          .on('pointerdown', () => this.scene.start('MapEditorScene', { puzzle: this.puzzle, level: this.currentLevel, rows: this.puzzle.rows, cols: this.puzzle.cols, stageNum: _getStageNum(this.currentLevel) }));
    }



    _undoLastMove() {
        if (this.isAnimating) return;
        const result = this.puzzle.undoLastMove();
        if (!result) return;

        if (this.isMegaStage && this._megaScoreHistory && this._megaScoreHistory.length > 0) {
            this.megaScore = this._megaScoreHistory.pop();
            this.scoreText.setText(`점수: ${this.megaScore}`);
        }

        this._rebuildGrid();
        this._updateMovesText();
        this._updateNeedHighlight();
        this._checkTutorialCondition('useItem', { item: 'undo' });
    }

    _wakeLoop() {
        this._sleepTimer = 0;
        if (this.game.loop.running) return;
        this.game.loop.wake();
    }

    update(time, delta) {
        if (this._tutorialHighlightData) {
            this._tutorialPulseTime = (this._tutorialPulseTime || 0) + delta;
            this._renderTutorialHighlight();
            this._sleepTimer = 0;
            return;
        }

        if (this.isAnimating || this.isDragging || this.tweens.getTweens().length > 0) {
            this._sleepTimer = 0;
            return;
        }

        this._sleepTimer = (this._sleepTimer || 0) + delta;
        if (this._sleepTimer > 1500) {
            this.game.loop.sleep();
        }
    }
}
