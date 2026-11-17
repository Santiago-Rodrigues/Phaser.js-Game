import { AUTO, Game } from 'phaser';
import type { Types } from 'phaser';
import { GameScene } from './game';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 800,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#00aa00',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                x: 0,
                y: 0,
            },
            debug: false,
        },
    },
    scene: [GameScene],
};

const StartGame = (parent: string): Game => {
    return new Game({
        ...config,
        parent,
    });
};

export default StartGame;