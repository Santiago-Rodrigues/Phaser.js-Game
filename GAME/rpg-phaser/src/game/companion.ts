export class Companion {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly stopDistance = 68
  private readonly followSpeed = 140
  private readonly textureKey: "kael" | "rian" | "lira"
  private readonly side: -1 | 1
  private readonly formationDistance = 75

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: "kael" | "rian" | "lira",
    side: -1 | 1,
  ) {
    this.textureKey = textureKey
    this.side = side
    this.sprite = scene.physics.add.sprite(x, y, this.textureKey)
    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setScale(0.28)
    this.sprite.setCollideWorldBounds(true)

    this.setCenteredFrame(0)
    this.sprite.setVelocity(0, 0)
  }

  private setCenteredFrame(frame: number): void {
    const visualCenters: Record<number, { x: number; y: number }> = {
      0: { x: 283.7, y: 137.8 },
      1: { x: 173.9, y: 139.2 },
      2: { x: 51.0, y: 141.4 },
      3: { x: 282.8, y: 123.8 },
      4: { x: 172.1, y: 129.8 },
      5: { x: 53.7, y: 133.6 },
      6: { x: 281.3, y: 123.2 },
      7: { x: 167.8, y: 121.6 },
      8: { x: 54.1, y: 115.0 },
      9: { x: 283.2, y: 104.2 },
      10: { x: 175.2, y: 103.8 },
      11: { x: 53.3, y: 100.2 },
    }

    const center = visualCenters[frame]
    this.sprite.setFrame(frame)

    if (center) {
      this.sprite.setOrigin(center.x / 341, center.y / 256)
    }
  }

  update(target: Phaser.Physics.Arcade.Sprite): void {
    if (!this.sprite.active || !this.sprite.body) {
      return
    }

    const targetOffsetX = this.side * this.formationDistance
    const targetOffsetY = this.formationDistance * 0.65

    const targetX = target.x - targetOffsetX
    const targetY = target.y + targetOffsetY

    const distanceX = targetX - this.sprite.x
    const distanceY = targetY - this.sprite.y
    const distance = Math.hypot(distanceX, distanceY)

    if (distance <= 20) {
      this.sprite.setVelocity(0, 0)
      return
    }

    this.sprite.setVelocity(
      (distanceX / distance) * this.followSpeed,
      (distanceY / distance) * this.followSpeed,
    )

    const frameIndex =
      Math.floor(this.sprite.scene.time.now / 150) % 3

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      const frames = distanceX > 0
        ? [3, 4, 5]
        : [6, 7, 8]
      this.setCenteredFrame(frames[frameIndex])
    } else {
      const frames = distanceY > 0
        ? [0, 1, 2]
        : [9, 10, 11]
      this.setCenteredFrame(frames[frameIndex])
    }
  }
}
