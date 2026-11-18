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
    this.sprite.setScale(0.28)
    this.sprite.setSize(200, 220)
    this.sprite.setOffset(28, 36)
    this.sprite.setFrame(0)
    this.sprite.setCollideWorldBounds(true)

    this.sprite.setVelocity(0, 0)
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

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      this.sprite.setFrame(distanceX > 0 ? 3 : 6)
    } else {
      this.sprite.setFrame(distanceY > 0 ? 0 : 9)
    }
  }
}
