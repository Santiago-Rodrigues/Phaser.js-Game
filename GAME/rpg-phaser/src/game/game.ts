import { Scene } from 'phaser';

export class GameScene extends Scene {
    constructor() {
        super('GameScene');
    }

    create(): void {
        this.cameras.main.setBackgroundColor('#00aa00');

        this.add
            .text(400, 320, 'Ambiente Phaser 4 funcionando!', {
                color: '#ffffff',
                fontFamily: 'Arial',
                fontSize: '28px',
            })
            .setOrigin(0.5);
    }
}