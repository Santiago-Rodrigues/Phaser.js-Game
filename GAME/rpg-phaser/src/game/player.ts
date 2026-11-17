import { Controls } from './controls';

export class Player {
    readonly sprite: Phaser.Physics.Arcade.Sprite;

    private readonly controls: Controls;
    private readonly speed = 180;
    private facing: 'up' | 'down' | 'left' | 'right' = 'down';

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.createPlaceholderTexture(scene);

        this.sprite = scene.physics.add.sprite(
            x,
            y,
            'player-placeholder'
        );

        this.sprite.setCollideWorldBounds(true);
        this.controls = new Controls(scene);
    }

    private createPlaceholderTexture(scene: Phaser.Scene): void {
        if (scene.textures.exists('player-placeholder')) {
            return;
        }

        const graphics = scene.add.graphics();

        graphics.fillStyle(0x3b82f6);
        graphics.fillRect(8, 4, 16, 24);

        graphics.fillStyle(0xfacc15);
        graphics.fillRect(10, 0, 12, 8);

        graphics.generateTexture(
            'player-placeholder',
            32,
            32
        );

        graphics.destroy();
    }

    update(): void {
        const movement = this.controls.getMovement();

        if (movement.horizontal === 0 && movement.vertical === 0) {
            this.sprite.setVelocity(0, 0);
            return;
        }

        const length = Math.hypot(
            movement.horizontal,
            movement.vertical
        );

        const horizontal = movement.horizontal / length;
        const vertical = movement.vertical / length;

        this.sprite.setVelocity(
            horizontal * this.speed,
            vertical * this.speed
        );

        if (Math.abs(horizontal) > Math.abs(vertical)) {
            this.facing = horizontal > 0 ? 'right' : 'left';
        } else {
            this.facing = vertical > 0 ? 'down' : 'up';
        }
    }

    getFacing(): 'up' | 'down' | 'left' | 'right' {
        return this.facing;
    }
}