import { Scene } from 'phaser';
import { Player } from './player';

export class GameScene extends Scene {
    private player!: Player;

    constructor() {
        super('GameScene');
    }

    create(): void {
        this.cameras.main.setBackgroundColor('#00aa00');

        this.player = new Player(this, 400, 320);

        this.add
            .text(400, 580, 'Use WASD ou as setas para mover', {
                color: '#ffffff',
                fontFamily: 'Arial',
                fontSize: '20px',
            })
            .setOrigin(0.5);
    }

    update(): void {
        this.player.update();
    }
}