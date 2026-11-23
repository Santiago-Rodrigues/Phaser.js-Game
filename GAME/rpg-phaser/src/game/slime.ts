export class Slime {
  private static readonly damageCooldown = 1000
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly maxHealth = 3
  private health = this.maxHealth
  private readonly healthBar: Phaser.GameObjects.Container
  private readonly healthFill: Phaser.GameObjects.Rectangle
  private readonly healthLabel: Phaser.GameObjects.Text
  private readonly maxSpeed = 70
  private stoppedUntil = 0
  private invulnerableUntil = 0

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly statue = false) {
    this.sprite = scene.physics.add.sprite(x, y, statue ? "statue-walk" : "slime", statue ? 26 : 0)

    this.sprite.setCollideWorldBounds(true)

    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setScale(statue ? 1.25 : 0.60)
    if (statue) this.sprite.setBodySize(38, 38)
    this.sprite.setVelocity(0, 0)

    const background = scene.add.rectangle(0, 0, 62, 11, 0x25171c)
    this.healthFill = scene.add.rectangle(-30, 0, 60, 11, 0xe32e3f)
      .setOrigin(0, 0.5)
    const frame = scene.add.image(0, 0, "enemy-health-frame").setDisplaySize(76, 51)
    this.healthLabel = scene.add.text(0, 0, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#26080c",
      strokeThickness: 2,
    }).setOrigin(0.5)
    this.healthBar = scene.add.container(x, y - 38, [background, this.healthFill, frame, this.healthLabel])
      .setDepth(10)
    this.updateHealthBar()
  }

  stopUntil(time: number): void {
    this.stoppedUntil = time
    this.sprite.setVelocity(0, 0)
    this.sprite.setImmovable(true)
  }

  update(player: Phaser.Physics.Arcade.Sprite): void {
    this.healthBar.setPosition(this.sprite.x, this.sprite.y - 38)
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

    if (this.statue) {
      const row = Math.abs(distanceX) > Math.abs(distanceY)
        ? (distanceX < 0 ? 1 : 3)
        : (distanceY < 0 ? 0 : 2)
      this.sprite.setFrame(row * 13 + Math.floor(now / 130) % 9)
    }

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
      this.healthBar.destroy()
      return true
    }

    this.updateHealthBar()
    this.invulnerableUntil = now + Slime.damageCooldown
    this.stopUntil(this.invulnerableUntil)
    this.sprite.setAlpha(0.35)
    return false
  }

  private updateHealthBar(): void {
    this.healthFill.setScale(this.health / this.maxHealth, 1)
    this.healthLabel.setText(`${this.health}/${this.maxHealth}`)
  }

  getHealth(): number {
    return this.health
  }
}
