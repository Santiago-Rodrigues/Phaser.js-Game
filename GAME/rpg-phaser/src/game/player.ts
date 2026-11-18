import { Controls } from "./controls"

export type PlayerCharacter = "kael" | "rian" | "lira"
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  character: PlayerCharacter

  private readonly controls: Controls
  private readonly speed = 180
  private facing: "up" | "down" | "left" | "right" = "down"

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    character: PlayerCharacter,
  ) {
    this.sprite = scene.physics.add.sprite(x, y, character)

    this.sprite.setScale(0.08)
    this.sprite.setSize(620, 760)
    this.sprite.setOffset(202, 200)

    this.sprite.setCollideWorldBounds(true)
    this.controls = new Controls(scene)

    this.character = character
  }

  getCharacter(): PlayerCharacter {
    return this.character
  }

  update(): void {
    const movement = this.controls.getMovement()

    if (movement.horizontal === 0 && movement.vertical === 0) {
      this.sprite.setVelocity(0, 0)
      return
    }

    const length = Math.hypot(movement.horizontal, movement.vertical)

    const horizontal = movement.horizontal / length
    const vertical = movement.vertical / length

    this.sprite.setVelocity(horizontal * this.speed, vertical * this.speed)

    if (Math.abs(horizontal) > Math.abs(vertical)) {
      this.facing = horizontal > 0 ? "right" : "left"
    } else {
      this.facing = vertical > 0 ? "down" : "up"
    }
  }

  getFacing(): "up" | "down" | "left" | "right" {
    return this.facing
  }

  setCharacter(character: PlayerCharacter): void {
    this.character = character
    this.sprite.setTexture(character)
  }
}
