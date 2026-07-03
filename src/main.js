import { MainScene } from './scenes/MainScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { SolutionScene } from './scenes/SolutionScene.js';
import { ColorGuideScene } from './scenes/ColorGuideScene.js';
import { MapEditorScene } from './scenes/MapEditorScene.js';

const _dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
    scene: [MainScene, GameScene, GameOverScene, SolutionScene, ColorGuideScene, MapEditorScene],
    input: {
        activePointers: 1
    }
};

const game = new Phaser.Game(config);
