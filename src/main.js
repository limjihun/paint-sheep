import { MainScene } from './scenes/MainScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { SolutionScene } from './scenes/SolutionScene.js';
import { ColorGuideScene } from './scenes/ColorGuideScene.js';
import { MapEditorScene } from './scenes/MapEditorScene.js';
import { RankingScene } from './scenes/RankingScene.js';
import { EventScene } from './scenes/EventScene.js';
import { MegaRankingScene } from './scenes/MegaRankingScene.js';

window.__PAINTSHEEP_BASE = './';

const _dpr = Math.min(window.devicePixelRatio || 1, 3);
const _origTextFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
    if (!style) style = {};
    if (!style.resolution) style.resolution = _dpr;
    return _origTextFactory.call(this, x, y, text, style);
};

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#f5e6d3',
    resolution: _dpr,
    fps: {
        target: 60,
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MainScene, GameScene, GameOverScene, SolutionScene, ColorGuideScene, MapEditorScene, RankingScene, EventScene, MegaRankingScene],
    input: {
        activePointers: 1
    }
};

(async () => {
    const base = window.__PAINTSHEEP_BASE || './';
    const fontUrl = base + 'assets/fonts/Jua.woff2';
    const style = document.createElement('style');
    style.textContent = `@font-face { font-family: 'Jua'; src: url('${fontUrl}') format('woff2'); font-display: block; }`;
    document.head.appendChild(style);

    await document.fonts.load('16px Jua');
    while (!document.fonts.check('16px Jua')) {
        await new Promise(r => setTimeout(r, 50));
    }
    const loading = document.getElementById('loading-screen');
    if (loading) loading.remove();
    new Phaser.Game(config);
})();
