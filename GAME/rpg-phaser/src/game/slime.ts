export class Slime {
  private static readonly damageCooldown = 1000
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private health = 3
  private readonly maxSpeed = 70
  private stoppedUntil = 0
  private invulnerableUntil = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "slime")

    this.sprite.setCollideWorldBounds(true)

    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setScale(0.60)
    this.sprite.setVelocity(0, 0)
  }

  stopUntil(time: number): void {
    this.stoppedUntil = time
    this.sprite.setVelocity(0, 0)
    this.sprite.setImmovable(true)
  }

  update(player: Phaser.Physics.Arcade.Sprite): void {
    const now = this.sprite.scene.time.now
    if (this.invulnerableUntil !== 0) {
      const remaining = this.invulnerableUntil - now
      if (remaining > 0) {
        const elapsed = Slime.damageCooldown - remaining
        this.sprite.setAlpha(Math.floor(elapsed / 100) % 2 === 0 ? 0.35 : 1)
      } else {
        this.sprite.setAlpha(1)
        this.invulnerableUntil = 0
      }
    }

    if (this.stoppedUntil !== 0) {
      if (now < this.stoppedUntil) {
        return
      }
      this.stoppedUntil = 0
      this.sprite.setImmovable(false)
    }

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
    const now = this.sprite.scene.time.now
    if (!this.sprite.active || now < this.invulnerableUntil) {
      return false
    }

    this.health -= amount

    if (this.health <= 0) {
      this.sprite.disableBody(true, true)
      return true
    }

    this.invulnerableUntil = now + Slime.damageCooldown
    this.sprite.setAlpha(0.35)
    return false
  }

  getHealth(): number {
    return this.health
  }
}
