export class Slime {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private health = 3
  private readonly maxSpeed = 70

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "slime")

    this.sprite.setCollideWorldBounds(true)

    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setScale(0.30)
    this.sprite.setVelocity(0, 0)
  }

  update(player: Phaser.Physics.Arcade.Sprite): void {
    const distanceX = player.x - this.sprite.x
    const distanceY = player.y - this.sprite.y
    const distance = Math.hypot(distanceX, distanceY)

    if (distance === 0) {
      this.sprite.setVelocity(0, 0)
      return
    }

    this.sprite.setVelocity(
      (distanceX / distance) * this.maxSpeed,
      (distanceY / distance) * this.maxSpeed,
    )
  }

  takeDamage(amount = 1): boolean {
    this.health -= amount

    if (this.health <= 0) {
      this.sprite.disableBody(true, true)
      return true
    }

    return false
  }

  getHealth(): number {
    return this.health
  }
}
