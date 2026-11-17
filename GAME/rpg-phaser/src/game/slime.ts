export class Slime {
    readonly sprite: Phaser.Physics.Arcade.Sprite;

    private health = 3;
    private readonly maxSpeed = 70;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number
    ) {
        this.createPlaceholderTexture(scene);

        this.sprite = scene.physics.add.sprite(
            x,
            y,
            'slime-placeholder'
        );

        this.sprite.setCollideWorldBounds(true);
    }

    private createPlaceholderTexture(
        scene: Phaser.Scene
    ): void {
        if (scene.textures.exists('slime-placeholder')) {
            return;
        }

        const graphics = scene.add.graphics();

        graphics.fillStyle(0x22c55e);
        graphics.fillCircle(16, 16, 14);

        graphics.fillStyle(0x14532d);
        graphics.fillCircle(11, 13, 2);
        graphics.fillCircle(21, 13, 2);

        graphics.generateTexture(
            'slime-placeholder',
            32,
            32
        );

        graphics.destroy();
    }

    update(player: Phaser.Physics.Arcade.Sprite): void {
        const distanceX = player.x - this.sprite.x;
        const distanceY = player.y - this.sprite.y;
        const distance = Math.hypot(distanceX, distanceY);

        if (distance === 0) {
            this.sprite.setVelocity(0, 0);
            return;
        }

        this.sprite.setVelocity(
            (distanceX / distance) * this.maxSpeed,
            (distanceY / distance) * this.maxSpeed
        );
    }

    takeDamage(amount = 1): boolean {
        this.health -= amount;

        if (this.health <= 0) {
            this.sprite.disableBody(
                true,
                true
            );
            return true;
        }

        return false;
    }

    getHealth(): number {
        return this.health;
    }
}