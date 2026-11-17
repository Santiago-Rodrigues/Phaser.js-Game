import { Scene } from "phaser"
import { Player } from "./player"
import { Slime } from "./slime"

export class GameScene extends Scene {
  private player!: Player
  private obstacles!: Phaser.Physics.Arcade.StaticGroup
  private slime!: Slime

  constructor() {
    super("GameScene")
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#223322")

    this.obstacles = this.physics.add.staticGroup()

    this.createObstacleTexture()

    for (let x = 80; x < 800; x += 80) {
      this.obstacles.create(x, 160, "obstacle-placeholder")
    }

    this.obstacles.create(400, 320, "obstacle-placeholder")

    this.player = new Player(this, 400, 520)

    this.slime = new Slime(this, 400, 260)

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

  update(): void {
    this.player.update()
    this.slime.update(this.player.sprite)

    this.physics.add.collider(this.player.sprite, this.obstacles)
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
