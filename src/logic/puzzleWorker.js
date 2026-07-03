import { CONFIG } from '../config.js';
import { PuzzleManager } from './PuzzleManager.js';

self.onmessage = (e) => {
    const { level } = e.data;
    const puzzle = new PuzzleManager(level);
    self.postMessage({
        grid: puzzle.grid,
        initialGrid: puzzle.initialGrid,
        rows: puzzle.rows,
        cols: puzzle.cols,
        planks: puzzle.planks,
        movesLeft: puzzle.movesLeft,
        initialMovesLeft: puzzle.initialMovesLeft,
        totalBlocks: puzzle.totalBlocks,
        minMoves: puzzle.minMoves,
        maxMoves: puzzle.maxMoves,
        solution: puzzle.solution,
        solutionStates: puzzle.solutionStates,
        allMoves: puzzle.allMoves,
        maxComponents: puzzle.maxComponents,
        plankChance: puzzle.plankChance,
        dirtyChance: puzzle.dirtyChance,
        rainbowChance: puzzle.rainbowChance,
        message: puzzle.message || '',
        tutorialData: puzzle.tutorialData || null,
    });
};
