import { CONFIG } from '../config.js';

export class PuzzleManager {
    constructor(level) {
        this.tutorialData = null;

        const gameLevel = Math.max(0, level - CONFIG.TUTORIAL_COUNT);
        const levelConfig = CONFIG.LEVELS[gameLevel] || CONFIG.LEVELS[CONFIG.LEVELS.length - 1];
        this.cols = CONFIG.GRID_COLS;
        this.rows = levelConfig.rows;
        this.maxComponents = levelConfig.maxComponents || 1;
        this.plankChance = levelConfig.plankChance || 0;
        this.dirtyChance = levelConfig.dirtyChance || 0;
        this.rainbowChance = levelConfig.rainbowChance || 0;
        this.movesBonus = levelConfig.movesBonus !== undefined ? levelConfig.movesBonus : 3;
        this.grid = [];
        this.planks = [];
        this.movesLeft = 0;
        this.totalBlocks = 0;
        this.clearedBlocks = 0;
        this.moveHistory = [];

        this._generateGrid();
    }

    _generateGrid() {
        if (this.tutorialData && this.tutorialData.fixedGrid) {
            this.grid = [];
            for (let row = 0; row < this.rows; row++) {
                const rowData = [];
                for (let col = 0; col < this.cols; col++) {
                    const src = this.tutorialData.fixedGrid[row][col];
                    let type = src.type || 'normal';
                    if (src.wallColor === 'RAINBOW') type = 'rainbow';
                    rowData.push({
                        wallColor: src.wallColor,
                        sheepComponents: type === 'dirty' ? ['DIRTY'] : [],
                        alive: true,
                        type,
                    });
                }
                this.grid.push(rowData);
            }
        } else {
            const targets = this._getAvailableTargets();
            this.grid = [];
            for (let row = 0; row < this.rows; row++) {
                const rowData = [];
                for (let col = 0; col < this.cols; col++) {
                    rowData.push({
                        wallColor: null,
                        sheepComponents: [],
                        alive: true,
                        type: 'normal',
                    });
                }
                this.grid.push(rowData);
            }
            this._fillClustered(targets);
            this._applyGimmicks();
        }

        this.totalBlocks = this.rows * this.cols;
        this._estimateMoves();
        this.movesLeft = this.minMoves;
        this.initialMovesLeft = this.movesLeft;
        this.initialGrid = this._snapshotGrid();
        this.initialPlanks = this.planks.map(p => ({ ...p }));
    }

    _fillClustered(targets) {
        const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
        const cells = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                cells.push({ row: r, col: c });
            }
        }

        // Shuffle cells
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }

        for (const { row, col } of cells) {
            if (visited[row][col]) continue;

            const color = targets[Math.floor(Math.random() * targets.length)];
            const clusterSize = 2 + Math.floor(Math.random() * 2); // 2 or 3

            // BFS to form a cluster
            const cluster = [];
            const queue = [{ row, col }];
            visited[row][col] = true;
            cluster.push({ row, col });

            while (queue.length > 0 && cluster.length < clusterSize) {
                const current = queue.splice(Math.floor(Math.random() * queue.length), 1)[0];
                const neighbors = this._getNeighbors(current.row, current.col);

                // Shuffle neighbors
                for (let i = neighbors.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
                }

                for (const n of neighbors) {
                    if (visited[n.row][n.col]) continue;
                    if (cluster.length >= clusterSize) break;
                    visited[n.row][n.col] = true;
                    cluster.push(n);
                    queue.push(n);
                }
            }

            for (const c of cluster) {
                this.grid[c.row][c.col].wallColor = color;
            }
        }

        // Fill any remaining (shouldn't happen, but safety)
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c].wallColor) {
                    this.grid[r][c].wallColor = targets[Math.floor(Math.random() * targets.length)];
                }
            }
        }
    }

    _getNeighbors(row, col) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const result = [];
        for (const [dr, dc] of dirs) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                result.push({ row: nr, col: nc });
            }
        }
        return result;
    }

    _applyGimmicks() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.grid[row][col];
                if (cell.type !== 'normal') continue;

                const roll = Math.random();
                if (roll < this.dirtyChance) {
                    cell.type = 'dirty';
                    cell.wallColor = 'WHITE';
                    cell.sheepComponents = ['DIRTY'];
                } else if (roll < this.dirtyChance + this.rainbowChance) {
                    cell.type = 'rainbow';
                    cell.wallColor = 'RAINBOW';
                }
            }
        }

        // Planks: horizontal platforms that cells rest on
        this.planks = [];
        if (this.plankChance > 0) {
            const usedCols = new Set();
            for (let row = 0; row < this.rows - 2; row++) {
                for (let col = 0; col < this.cols - 1; col++) {
                    if (Math.random() >= this.plankChance) continue;
                    const a = this.grid[row][col];
                    const b = this.grid[row][col + 1];
                    if (a.type !== 'normal' || b.type !== 'normal') continue;

                    if (usedCols.has(col) || usedCols.has(col + 1)) continue;

                    const below0 = this.grid[row + 1][col];
                    const below1 = this.grid[row + 1][col + 1];
                    if (a.wallColor === below0.wallColor || b.wallColor === below1.wallColor) continue;

                    this.planks.push({ row, startCol: col, endCol: col + 1 });
                    usedCols.add(col);
                    usedCols.add(col + 1);
                }
            }
        }
    }

    _estimateMoves() {
        const solver = new PuzzleSolver(this.grid, this.rows, this.cols, this.planks);
        const result = solver.solve();
        this.solution = result.path;
        this.solutionStates = result.states;
        this.solutionPlankStates = result.plankStates;
        this.allMoves = result.allMoves;
        this.minMoves = this.solution.length;
        this.maxMoves = this.minMoves;
    }

    _getAvailableTargets() {
        const targets = [];
        for (const [name, info] of Object.entries(CONFIG.MIXED_COLORS)) {
            if (info.components.length <= this.maxComponents) {
                targets.push(name);
            }
        }
        return targets;
    }


    static fromWorkerData(data) {
        const puzzle = Object.create(PuzzleManager.prototype);
        const copyGrid = g => g.map(row => row.map(cell => ({ ...cell, sheepComponents: [...(cell.sheepComponents || [])] })));
        puzzle.grid = copyGrid(data.grid);
        puzzle.initialGrid = copyGrid(data.initialGrid);
        puzzle.rows = data.rows;
        puzzle.cols = data.cols;
        puzzle.planks = (data.planks || []).map(p => ({ row: p.row, startCol: p.startCol ?? p.col ?? 0, endCol: p.endCol ?? p.col ?? 0 }));
        puzzle.initialPlanks = puzzle.planks.map(p => ({ ...p }));
        puzzle.movesLeft = data.movesLeft;
        puzzle.initialMovesLeft = data.initialMovesLeft;
        puzzle.totalBlocks = data.totalBlocks;
        puzzle.clearedBlocks = 0;
        puzzle.moveHistory = [];
        puzzle.minMoves = data.minMoves;
        puzzle.maxMoves = data.maxMoves;
        puzzle.solution = data.solution;
        puzzle.solutionStates = data.solutionStates;
        puzzle.solutionPlankStates = data.solutionPlankStates;
        puzzle.allMoves = data.allMoves;
        puzzle.maxComponents = data.maxComponents;
        puzzle.plankChance = data.plankChance;
        puzzle.dirtyChance = data.dirtyChance;
        puzzle.rainbowChance = data.rainbowChance;
        puzzle.message = data.message || '';
        puzzle.tutorialData = data.tutorialData || null;
        return puzzle;
    }

    reset() {
        this.grid = this.initialGrid.map(row => row.map(cell => ({ ...cell, sheepComponents: [...(cell.sheepComponents || [])] })));
        this.planks = (this.initialPlanks || []).map(p => ({ ...p }));
        this.movesLeft = this.initialMovesLeft;
        this.clearedBlocks = 0;
        this.moveHistory = [];
        this._tutorialStepIndex = 0;
    }

    static resolveColor(components) {
        if (!components || components.length === 0) return 'WHITE';
        if (components.includes('DIRTY')) return 'DIRTY';

        const sorted = [...components].sort();
        for (const [name, info] of Object.entries(CONFIG.MIXED_COLORS)) {
            const infoSorted = [...info.components].sort();
            if (sorted.length === infoSorted.length && sorted.every((v, i) => v === infoSorted[i])) {
                return name;
            }
        }
        return 'WHITE';
    }

    paintPath(path, component) {
        if (this.movesLeft <= 0) return null;
        if (path.length === 0) return null;

        const snapshot = this._snapshotGrid();
        const painted = [];

        for (const { row, col } of path) {
            const cell = this.grid[row][col];
            if (!cell || !cell.alive) continue;
            if (cell.type === 'dirty') continue;
            if (cell.masked) {
                cell.masked = false;
                painted.push({ row, col, maskedConsumed: true });
            } else if (!cell.sheepComponents.includes(component)) {
                cell.sheepComponents.push(component);
                const target = CONFIG.MIXED_COLORS[cell.wallColor];
                const needed = cell.type === 'rainbow' || (target && target.components.includes(component));
                painted.push({ row, col, maskedConsumed: false, needed });
            }
        }

        if (painted.length === 0) return null;

        this.movesLeft--;
        const cleared = this._checkAllCleared();
        this.moveHistory.push({ gridSnapshot: snapshot, planksSnapshot: this._snapshotPlanks(), prevClearedBlocks: this.clearedBlocks - cleared.length });

        return { painted, cleared };
    }

    washPath(path) {
        if (this.movesLeft <= 0) return null;
        if (path.length === 0) return null;

        const hasWashable = path.some(({ row, col }) => {
            const cell = this.grid[row][col];
            return cell && cell.alive && (cell.sheepComponents.length > 0);
        });
        if (!hasWashable) return null;

        const snapshot = this._snapshotGrid();
        const washed = [];

        for (const { row, col } of path) {
            const cell = this.grid[row][col];
            if (!cell || !cell.alive) continue;
            if (cell.type === 'dirty') {
                cell.sheepComponents = [];
                cell.type = 'normal';
                washed.push({ row, col, wasDirty: true });
            } else if (cell.sheepComponents.length > 0) {
                cell.sheepComponents = [];
                washed.push({ row, col, wasDirty: false });
            }
        }

        this.movesLeft--;
        this.moveHistory.push({ gridSnapshot: snapshot, planksSnapshot: this._snapshotPlanks(), prevClearedBlocks: this.clearedBlocks });

        const cleared = this._checkAllCleared();
        return { washed, cleared };
    }

    _checkAllCleared() {
        const cleared = [];

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.grid[row][col];
                if (!cell || !cell.alive) continue;

                if (cell.type === 'rainbow' && cell.sheepComponents.length > 0) {
                    cleared.push({ row, col });
                } else if (cell.type === 'dirty') {
                    if (cell.sheepComponents.length === 0) {
                        cleared.push({ row, col });
                    }
                } else {
                    const resolved = PuzzleManager.resolveColor(cell.sheepComponents);
                    if (resolved === cell.wallColor) {
                        cleared.push({ row, col });
                    }
                }
            }
        }

        for (const c of cleared) {
            this.grid[c.row][c.col].alive = false;
            this.clearedBlocks++;
        }

        return cleared;
    }

    _snapshotGrid() {
        return this.grid.map(row => row.map(cell => ({ ...cell, sheepComponents: [...(cell.sheepComponents || [])] })));
    }

    _snapshotPlanks() {
        return this.planks.map(p => ({ ...p }));
    }

    paintSingleCell(row, col) {
        const cell = this.grid[row][col];
        if (!cell || !cell.alive) return null;

        const snapshot = this._snapshotGrid();
        this.moveHistory.push({ gridSnapshot: snapshot, planksSnapshot: this._snapshotPlanks(), prevClearedBlocks: this.clearedBlocks, isItem: 'singlePaint' });

        if (cell.type === 'dirty') {
            cell.sheepComponents = [];
        } else if (cell.type === 'rainbow') {
            cell.sheepComponents = ['RED', 'YELLOW', 'BLUE'];
        } else {
            const target = CONFIG.MIXED_COLORS[cell.wallColor];
            cell.sheepComponents = target ? [...target.components] : [];
        }
        cell.alive = false;
        if (cell.masked) cell.masked = false;
        this.clearedBlocks++;

        return { row, col, cleared: [{ row, col }] };
    }

    applyMask(row, col) {
        const cell = this.grid[row][col];
        if (!cell || !cell.alive) return false;
        if (cell.masked) return false;
        if (cell.type === 'dirty') return false;

        const snapshot = this._snapshotGrid();
        this.moveHistory.push({ gridSnapshot: snapshot, planksSnapshot: this._snapshotPlanks(), prevClearedBlocks: this.clearedBlocks, isItem: 'mask' });

        cell.masked = true;
        return true;
    }

    herdSheep(direction) {
        const snapshot = this._snapshotGrid();
        this.moveHistory.push({ gridSnapshot: snapshot, planksSnapshot: this._snapshotPlanks(), prevClearedBlocks: this.clearedBlocks, isItem: 'herd' });

        for (let row = 0; row < this.rows; row++) {
            const alive = [];
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row][col].alive) alive.push(this.grid[row][col]);
            }
            const emptyCell = () => ({ wallColor: null, sheepComponents: [], alive: false, type: 'normal' });
            const newRow = Array.from({ length: this.cols }, emptyCell);
            if (direction === 'left') {
                for (let i = 0; i < alive.length; i++) newRow[i] = alive[i];
            } else {
                const start = this.cols - alive.length;
                for (let i = 0; i < alive.length; i++) newRow[start + i] = alive[i];
            }
            this.grid[row] = newRow;
        }
    }

    _isOnPlank(row, col) {
        return this.planks.some(p => p.row === row && col >= p.startCol && col <= p.endCol);
    }

    _isPlankSupported(plank) {
        for (let col = plank.startCol; col <= plank.endCol; col++) {
            if (plank.row + 1 >= this.rows) return true;
            const below = this.grid[plank.row + 1][col];
            if (below && below.alive) return true;
            if (this.planks.some(p => p !== plank && p.row === plank.row + 1 && col >= p.startCol && col <= p.endCol)) return true;
        }
        return false;
    }

    applyGravity() {
        let changed = true;
        const fallen = [];
        const planksBefore = this.planks.map(p => ({ ...p }));

        while (changed) {
            changed = false;

            // Drop unsupported planks first
            for (const plank of this.planks) {
                if (this._isPlankSupported(plank)) continue;

                let canDrop = true;
                for (let col = plank.startCol; col <= plank.endCol; col++) {
                    if (plank.row + 1 >= this.rows) { canDrop = false; break; }
                }
                if (!canDrop) continue;

                // Move cells sitting on this plank down too
                for (let col = plank.startCol; col <= plank.endCol; col++) {
                    const cell = this.grid[plank.row][col];
                    if (cell && cell.alive) {
                        if (plank.row + 1 < this.rows && !this.grid[plank.row + 1][col].alive) {
                            this.grid[plank.row + 1][col] = cell;
                            this.grid[plank.row][col] = { wallColor: null, sheepComponents: [], alive: false, type: 'normal' };
                            fallen.push({ fromRow: plank.row, toRow: plank.row + 1, col });
                        }
                    }
                }

                plank.row += 1;
                changed = true;
            }

            // Drop individual cells
            for (let col = 0; col < this.cols; col++) {
                for (let row = this.rows - 2; row >= 0; row--) {
                    const cell = this.grid[row][col];
                    if (!cell || !cell.alive) continue;

                    if (row + 1 >= this.rows) continue;
                    const below = this.grid[row + 1][col];
                    if (below && below.alive) continue;
                    if (this._isOnPlank(row, col)) continue;

                    this.grid[row + 1][col] = cell;
                    this.grid[row][col] = { wallColor: null, sheepComponents: [], alive: false, type: 'normal' };
                    fallen.push({ fromRow: row, toRow: row + 1, col });
                    changed = true;
                }
            }
        }

        const result = [];
        const origins = new Map();
        for (const f of fallen) {
            const destKey = `${f.toRow},${f.col}`;
            const srcKey = `${f.fromRow},${f.col}`;
            if (origins.has(srcKey)) {
                const origin = origins.get(srcKey);
                origins.delete(srcKey);
                origins.set(destKey, origin);
                origin.toRow = f.toRow;
            } else {
                origins.set(destKey, f);
                result.push(f);
            }
        }

        // Compute plank movements
        const fallenPlanks = [];
        for (let i = 0; i < this.planks.length; i++) {
            if (planksBefore[i].row !== this.planks[i].row) {
                fallenPlanks.push({ index: i, fromRow: planksBefore[i].row, toRow: this.planks[i].row, startCol: this.planks[i].startCol, endCol: this.planks[i].endCol });
            }
        }

        return { fallen: result, fallenPlanks };
    }

    isCleared() {
        return this.clearedBlocks >= this.totalBlocks;
    }

    isGameOver() {
        return this.movesLeft <= 0 && !this.isCleared();
    }

    undoLastMove() {
        if (this.moveHistory.length === 0) return null;

        const lastMove = this.moveHistory.pop();
        this.grid = lastMove.gridSnapshot;
        this.planks = lastMove.planksSnapshot || [];
        this.clearedBlocks = lastMove.prevClearedBlocks;
        if (!lastMove.isItem) this.movesLeft++;

        return { fullRebuild: true, itemType: lastMove.isItem || null };
    }
}

class PuzzleSolver {
    constructor(grid, rows, cols, planks) {
        this.rows = rows;
        this.cols = cols;
        this.initialPlanks = (planks || []).map(p => ({
            row: p.row,
            startCol: p.startCol ?? p.col ?? 0,
            endCol: p.endCol ?? p.col ?? 0,
        }));
        this.planks = this.initialPlanks;
        this.originalGrid = grid.map(row => row.map(cell => ({
            wallColor: cell.wallColor,
            sheepComponents: [...(cell.sheepComponents || [])],
            alive: cell.alive,
            type: cell.type,
        })));
    }

    solve() {
        const memo = new Map();
        const MAX_DEPTH = 15;

        const initState = { grid: this.originalGrid, planks: this.initialPlanks.map(p => ({...p})) };
        this._search(initState, memo, 0, MAX_DEPTH);

        const path = [];
        const states = [];
        const plankStates = [];
        let current = initState;
        let depth = 0;

        states.push(this._cloneGrid(current.grid));
        plankStates.push(current.planks.map(p => ({...p})));

        while (!this._isCleared(current.grid) && depth < MAX_DEPTH) {
            const key = this._encodeState(current);
            const entry = memo.get(key);
            if (!entry || !entry.bestMove) break;

            path.push(entry.bestMove);
            current = this._applyMove(current, entry.bestMove);
            states.push(this._cloneGrid(current.grid));
            plankStates.push(current.planks.map(p => ({...p})));
            depth++;
        }

        return { min: path.length, path, states, plankStates, allMoves: [path.length] };
    }

    _findMaxPathInGroup(startRow, startCol, groupSet, pathCells) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        const startKey = `${startRow},${startCol}`;
        let bestPath = [startKey];
        let bestNeedCount = 1;
        const path = [startKey];
        const visited = new Set([startKey]);
        let needCount = 1;

        const dfs = () => {
            if (needCount > bestNeedCount) {
                bestNeedCount = needCount;
                bestPath = [...path];
            }
            if (needCount === groupSet.size) return;
            const [r, c] = path[path.length - 1].split(',').map(Number);
            for (const [dr, dc] of dirs) {
                const nk = `${r+dr},${c+dc}`;
                if (pathCells.has(nk) && !visited.has(nk)) {
                    visited.add(nk);
                    path.push(nk);
                    const isNeed = groupSet.has(nk);
                    if (isNeed) needCount++;
                    dfs();
                    if (bestNeedCount === groupSet.size) return;
                    path.pop();
                    visited.delete(nk);
                    if (isNeed) needCount--;
                }
            }
        };

        dfs();
        return bestPath;
    }

    _cloneGrid(grid) {
        return grid.map(row => row.map(cell => ({
            ...cell, sheepComponents: [...(cell.sheepComponents || [])]
        })));
    }

    _search(state, memo, depth, maxDepth) {
        if (depth >= maxDepth) return Infinity;

        const key = this._encodeState(state);
        if (memo.has(key)) return memo.get(key).min;

        if (this._isCleared(state.grid)) {
            memo.set(key, { min: 0, bestMove: null });
            return 0;
        }

        const moves = this._generateMoves(state.grid);

        if (moves.length === 0) {
            memo.set(key, { min: Infinity, bestMove: null });
            return Infinity;
        }

        let bestMin = Infinity;
        let bestMove = null;

        for (const move of moves) {
            const newState = this._applyMove(state, move);
            const sub = this._search(newState, memo, depth + 1, maxDepth);

            if (sub + 1 < bestMin) {
                bestMin = sub + 1;
                bestMove = move;
            }
        }

        memo.set(key, { min: bestMin, bestMove });
        return bestMin;
    }

    _encodeState(state) {
        const grid = state.grid;
        let key = '';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = grid[r][c];
                if (!cell.alive) {
                    key += 'X';
                } else {
                    const wallMap = { ORANGE: 0, PURPLE: 1, GREEN: 2, BLACK: 3, RED: 4, YELLOW: 5, BLUE: 6, WHITE: 7, RAINBOW: 8 };
                    const w = wallMap[cell.wallColor] !== undefined ? wallMap[cell.wallColor] : 9;
                    let bits = 0;
                    for (const comp of cell.sheepComponents) {
                        if (comp === 'RED') bits |= 1;
                        else if (comp === 'YELLOW') bits |= 2;
                        else if (comp === 'BLUE') bits |= 4;
                        else if (comp === 'DIRTY') bits |= 8;
                    }
                    key += w.toString(16) + bits.toString(16);
                }
            }
        }
        if (state.planks.length > 0) {
            key += '|';
            for (const p of state.planks) {
                key += `${p.row}${p.startCol}${p.endCol}`;
            }
        }
        return key;
    }

    _isCleared(grid) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (grid[r][c].alive) return false;
            }
        }
        return true;
    }

    _generateMoves(grid) {
        const moves = [];
        const aliveCells = [];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (grid[r][c].alive) {
                    aliveCells.push({ row: r, col: c });
                }
            }
        }

        for (const component of CONFIG.PALETTE) {
            const needCells = new Set();
            const passableCells = new Set();
            for (const { row, col } of aliveCells) {
                const cell = grid[row][col];
                if (cell.type === 'dirty') { passableCells.add(`${row},${col}`); continue; }
                if (cell.type === 'rainbow' && cell.sheepComponents.length === 0) { needCells.add(`${row},${col}`); continue; }
                if (cell.type === 'rainbow') continue;
                const target = CONFIG.MIXED_COLORS[cell.wallColor];
                if (!target) continue;
                if (target.components.includes(component) && !cell.sheepComponents.includes(component)) {
                    needCells.add(`${row},${col}`);
                } else if (cell.sheepComponents.includes(component)) {
                    passableCells.add(`${row},${col}`);
                }
            }
            if (needCells.size === 0) continue;

            const traversable = new Set([...needCells, ...passableCells]);
            const visited = new Set();
            const groups = [];
            for (const key of needCells) {
                if (visited.has(key)) continue;
                const group = [];
                const queue = [key];
                visited.add(key);
                while (queue.length > 0) {
                    const cur = queue.shift();
                    if (needCells.has(cur)) group.push(cur);
                    const [cr, cc] = cur.split(',').map(Number);
                    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                        const nk = `${cr+dr},${cc+dc}`;
                        if (!visited.has(nk) && traversable.has(nk)) { visited.add(nk); queue.push(nk); }
                    }
                }
                if (group.length > 0) groups.push(group);
            }

            for (const group of groups) {
                const groupSet = new Set(group);
                const pathCells = new Set(group);
                for (const key of group) {
                    const [cr, cc] = key.split(',').map(Number);
                    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                        const nk = `${cr+dr},${cc+dc}`;
                        if (passableCells.has(nk)) pathCells.add(nk);
                    }
                }
                const seen = new Set();
                for (const startKey of group) {
                    const [sr, sc] = startKey.split(',').map(Number);
                    const bestPath = this._findMaxPathInGroup(sr, sc, groupSet, pathCells);
                    const needOnly = bestPath.filter(k => groupSet.has(k));
                    const pathKey = [...needOnly].sort().join('|');
                    if (seen.has(pathKey)) continue;
                    seen.add(pathKey);
                    const cells = bestPath.map(k => { const [r,c] = k.split(',').map(Number); return {row:r,col:c}; });
                    moves.push({ component, cells });
                }
            }
        }

        // Wash moves
        const dirtyCells = new Set();
        for (const { row, col } of aliveCells) {
            const cell = grid[row][col];
            if (cell.type === 'dirty' && cell.sheepComponents.includes('DIRTY')) {
                dirtyCells.add(`${row},${col}`);
            }
        }
        if (dirtyCells.size > 0) {
            const visited = new Set();
            const groups = [];
            for (const key of dirtyCells) {
                if (visited.has(key)) continue;
                const group = [];
                const queue = [key];
                visited.add(key);
                while (queue.length > 0) {
                    const cur = queue.shift();
                    group.push(cur);
                    const [cr, cc] = cur.split(',').map(Number);
                    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                        const nk = `${cr+dr},${cc+dc}`;
                        if (!visited.has(nk) && dirtyCells.has(nk)) { visited.add(nk); queue.push(nk); }
                    }
                }
                groups.push(group);
            }
            for (const group of groups) {
                const cells = group.map(k => { const [r,c] = k.split(',').map(Number); return {row:r,col:c}; });
                moves.push({ component: 'WASH', cells });
            }
        }

        return moves;
    }


    _applyMove(state, move) {
        const newGrid = state.grid.map(row => row.map(cell => ({
            ...cell,
            sheepComponents: [...(cell.sheepComponents || [])],
        })));
        const newPlanks = state.planks.map(p => ({ ...p }));

        if (move.component === 'WASH') {
            for (const { row, col } of move.cells) {
                const cell = newGrid[row][col];
                if (!cell.alive) continue;
                if (cell.type === 'dirty') {
                    cell.sheepComponents = [];
                    cell.type = 'normal';
                } else {
                    cell.sheepComponents = [];
                }
            }
        } else {
            for (const { row, col } of move.cells) {
                const cell = newGrid[row][col];
                if (!cell.alive) continue;
                if (cell.type === 'dirty') continue;
                if (!cell.sheepComponents.includes(move.component)) {
                    cell.sheepComponents.push(move.component);
                }
            }
        }

        this._clearMatched(newGrid);
        this._applyGravityDynamic(newGrid, newPlanks);
        let cascaded = true;
        while (cascaded) {
            const cleared = this._clearMatched(newGrid);
            if (cleared > 0) {
                this._applyGravityDynamic(newGrid, newPlanks);
            } else {
                cascaded = false;
            }
        }

        return { grid: newGrid, planks: newPlanks };
    }

    _clearMatched(grid) {
        let count = 0;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = grid[r][c];
                if (!cell.alive) continue;

                let matches = false;
                if (cell.type === 'rainbow' && cell.sheepComponents.length > 0) {
                    matches = true;
                } else if (cell.type === 'dirty') {
                    if (cell.sheepComponents.length === 0) matches = true;
                } else {
                    const resolved = PuzzleManager.resolveColor(cell.sheepComponents);
                    if (resolved === cell.wallColor) matches = true;
                }

                if (matches) {
                    cell.alive = false;
                    count++;
                }
            }
        }

        return count;
    }

    _applyGravityDynamic(grid, planks) {
        let changed = true;
        while (changed) {
            changed = false;

            for (const plank of planks) {
                let supported = false;
                for (let col = plank.startCol; col <= plank.endCol; col++) {
                    if (plank.row + 1 >= this.rows) { supported = true; break; }
                    const below = grid[plank.row + 1][col];
                    if (below && below.alive) { supported = true; break; }
                    if (planks.some(p => p !== plank && p.row === plank.row + 1 && col >= p.startCol && col <= p.endCol)) {
                        supported = true; break;
                    }
                }
                if (!supported) {
                    let canDrop = true;
                    for (let col = plank.startCol; col <= plank.endCol; col++) {
                        if (plank.row + 1 >= this.rows) { canDrop = false; break; }
                    }
                    if (canDrop) {
                        for (let col = plank.startCol; col <= plank.endCol; col++) {
                            const cell = grid[plank.row][col];
                            if (cell && cell.alive && plank.row + 1 < this.rows && !grid[plank.row + 1][col].alive) {
                                grid[plank.row + 1][col] = cell;
                                grid[plank.row][col] = { wallColor: null, sheepComponents: [], alive: false, type: 'normal' };
                            }
                        }
                        plank.row += 1;
                        changed = true;
                    }
                }
            }

            for (let col = 0; col < this.cols; col++) {
                for (let row = this.rows - 2; row >= 0; row--) {
                    const cell = grid[row][col];
                    if (!cell || !cell.alive) continue;
                    if (row + 1 >= this.rows) continue;
                    if (grid[row + 1][col].alive) continue;
                    if (planks.some(p => p.row === row && col >= p.startCol && col <= p.endCol)) continue;

                    grid[row + 1][col] = cell;
                    grid[row][col] = { wallColor: null, sheepComponents: [], alive: false, type: 'normal' };
                    changed = true;
                }
            }
        }
    }
}
