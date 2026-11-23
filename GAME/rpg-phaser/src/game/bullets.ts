export type FacingDirection = 'up' | 'down' | 'left' | 'right';

export class Bullet {
    readonly sprite: Phaser.Physics.Arcade.Sprite;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        direction: FacingDirection,
        color: number,
        speed = 360
    ) {
        this.createPlaceholderTexture(scene);

        this.sprite = scene.physics.add.sprite(
            x,
            y,
            'bullet-placeholder'
        );

        this.sprite.setCollideWorldBounds(true);
        this.sprite.setTint(color);

        const velocities: Record<
            FacingDirection,
            { x: number; y: number }
        > = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
        };

        const velocity = velocities[direction];

        this.sprite.setVelocity(
            velocity.x * speed,
            velocity.y * speed
        );

        this.sprite.setData(
            'createdAt',
            scene.time.now
        );
    }

    private createPlaceholderTexture(
        scene: Phaser.Scene
    ): void {
        if (scene.textures.exists('bullet-placeholder')) {
            return;
        }

        const graphics = scene.add.graphics();

        graphics.fillStyle(0xffffff);
        graphics.fillCircle(8, 8, 6);

        graphics.generateTexture(
            'bullet-placeholder',
            16,
            16
        );

        graphics.destroy();
    }

    update(scene: Phaser.Scene): void {
        const age = scene.time.now
            - this.sprite.getData('createdAt');

        if (age >= 1500) {
            this.sprite.disableBody(true, true);
        }
    }
}
