import { Scene } from "phaser"
import { Player } from "./player"
import { Slime } from "./slime"
import { Bullet } from "./bullets"

export class GameScene extends Scene {
  private player!: Player
  private obstacles!: Phaser.Physics.Arcade.StaticGroup
  private slime!: Slime
  private readonly bullets: Bullet[] = []
  private attackKey!: Phaser.Input.Keyboard.Key
  private nextShotAt = 0
  private playerLayer!: Phaser.GameObjects.Container
  private enemyLayer!: Phaser.GameObjects.Container
  private projectileLayer!: Phaser.GameObjects.Container

  constructor() {
    super("GameScene")
  }

  create(): void {
    this.playerLayer = this.add.container()
    this.enemyLayer = this.add.container()
    this.projectileLayer = this.add.container()

    this.cameras.main.setBackgroundColor("#223322")

    this.obstacles = this.physics.add.staticGroup()

    this.createObstacleTexture()

    for (let x = 80; x < 800; x += 80) {
      this.obstacles.create(x, 160, "obstacle-placeholder")
    }

    this.obstacles.create(400, 320, "obstacle-placeholder")

    this.player = new Player(this, 400, 520)

    this.playerLayer.add(this.player.sprite)

    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error("O teclado não está disponível nesta cena.")
    }

    this.attackKey = keyboard.addKey("SPACE")

    this.slime = new Slime(this, 400, 260)

    this.enemyLayer.add(this.slime.sprite)

    this.physics.add.collider(this.player.sprite, this.slime.sprite)

    this.physics.add.collider(this.slime.sprite, this.obstacles)

    this.physics.add.collider(this.player.sprite, this.obstacles)

    this.add
      .text(400, 580, "WASD / Setas — teste de colisões", {
        color: "#ffffff",
        fontFamily: "Arial",
        fontSize: "20px",
      })
      .setOrigin(0.5)
  }

  private shoot(): void {
    if (this.time.now < this.nextShotAt) {
      return
    }

    const direction = this.player.getFacing()
    const offset = 24

    let x = this.player.sprite.x
    let y = this.player.sprite.y

    if (direction === "up") y -= offset
    if (direction === "down") y += offset
    if (direction === "left") x -= offset
    if (direction === "right") x += offset

    const bullet = new Bullet(this, x, y, direction)

    this.bullets.push(bullet)
    this.nextShotAt = this.time.now + 300

    this.physics.add.collider(bullet.sprite, this.obstacles, () => {
      bullet.sprite.disableBody(true, true)
    })

    this.physics.add.overlap(bullet.sprite, this.slime.sprite, () => {
      if (!bullet.sprite.active) {
        return
      }

      bullet.sprite.disableBody(true, true)

      if (this.slime.sprite.active) {
        this.slime.takeDamage()
      }
    })

    this.projectileLayer.add(bullet.sprite)
  }

  update(): void {
    this.player.update()

    if (this.slime.sprite.active) {
      this.slime.update(this.player.sprite)
    }

    if (this.attackKey.isDown) {
      this.shoot()
    }

    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index]

      bullet.update(this)

      if (!bullet.sprite.active) {
        this.bullets.splice(index, 1)
      }
    }
  }

  private createObstacleTexture(): void {
    if (this.textures.exists("obstacle-placeholder")) {
      return
    }

    const graphics = this.add.graphics()

    graphics.fillStyle(0x6b7280)
    graphics.fillRect(0, 0, 64, 64)

    graphics.lineStyle(4, 0x374151)
    graphics.strokeRect(2, 2, 60, 60)

    graphics.generateTexture("obstacle-placeholder", 64, 64)

    graphics.destroy()
  }
}
