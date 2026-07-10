export const CONFIG = {
    // RYB primary palette (paintable by player)
    PALETTE: ['RED', 'YELLOW', 'BLUE'],

    // All possible mixed results (wall target colors)
    MIXED_COLORS: {
        RED:    { components: ['RED'],                hex: '#E53935' },
        YELLOW: { components: ['YELLOW'],             hex: '#FFD600' },
        BLUE:   { components: ['BLUE'],               hex: '#2979FF' },
        ORANGE: { components: ['RED', 'YELLOW'],      hex: '#FF9100' },
        PURPLE: { components: ['RED', 'BLUE'],        hex: '#6A1B9A' },
        GREEN:  { components: ['YELLOW', 'BLUE'],     hex: '#00C853' },
        BLACK:  { components: ['RED', 'YELLOW', 'BLUE'], hex: '#212121' },
    },

    DISPLAY_COLORS: {
        WHITE: '#FFFFFF',
        RED: '#E53935',
        YELLOW: '#FFD600',
        BLUE: '#2979FF',
        ORANGE: '#FF9100',
        PURPLE: '#6A1B9A',
        GREEN: '#00C853',
        BLACK: '#212121',
        DIRTY: '#333333',
        RAINBOW: '#FFFFFF',
    },

    COLOR_NAMES: {
        WHITE: '흰색',
        RED: '빨강',
        YELLOW: '노랑',
        BLUE: '파랑',
        ORANGE: '주황',
        PURPLE: '보라',
        GREEN: '초록',
        BLACK: '검정',
    },

    TUTORIAL_COUNT: 0,

    GRID_COLS: 5,

    ITEM_SLOTS: 4,

    LAYOUT: {
        HEADER_RATIO: 0.10,
        GRID_RATIO: 0.66,
        PALETTE_RATIO: 0.12,
        ITEM_RATIO: 0.12,
    },

    LEVELS: [
        { rows: 5, maxComponents: 1, movesBonus: 3, plankChance: 0, dirtyChance: 0, rainbowChance: 0 },
        { rows: 5, maxComponents: 2, movesBonus: 2, plankChance: 0.1, dirtyChance: 0, rainbowChance: 0.05 },
        { rows: 6, maxComponents: 2, movesBonus: 2, plankChance: 0.15, dirtyChance: 0.05, rainbowChance: 0.05 },
        { rows: 6, maxComponents: 3, movesBonus: 1, plankChance: 0.15, dirtyChance: 0.1, rainbowChance: 0.08 },
        { rows: 7, maxComponents: 3, movesBonus: 1, plankChance: 0.2, dirtyChance: 0.1, rainbowChance: 0.1 },
    ],
};
