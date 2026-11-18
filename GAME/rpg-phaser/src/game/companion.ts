export class Companion {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly stopDistance = 68
  private readonly followSpeed = 140
  private readonly textureKey: "rian" | "lira"
  private readonly side: -1 | 1
  private readonly formationDistance = 75

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: "rian" | "lira",
    side: -1 | 1,
  ) {
    this.textureKey = textureKey
    this.side = side
    this.sprite = scene.physics.add.sprite(x, y, this.textureKey)
    this.sprite.setScale(0.08)
    this.sprite.setSize(620, 760)
    this.sprite.setOffset(202, 200)
    this.sprite.setCollideWorldBounds(true)
  }

  update(target: Phaser.Physics.Arcade.Sprite): void {
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
  }
}
