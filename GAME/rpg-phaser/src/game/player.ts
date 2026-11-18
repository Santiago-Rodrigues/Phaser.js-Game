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

    this.sprite.setScale(0.28)
    this.sprite.setSize(200, 220)
    this.sprite.setOffset(28, 36)
    this.sprite.setFrame(0)

    this.sprite.setCollideWorldBounds(true)

    this.controls = new Controls(scene)

    this.character = character

    this.sprite.setVelocity(0, 0)
  }

  getCharacter(): PlayerCharacter {
    return this.character
  }

  update(): void {
    const movement = this.controls.getMovement()
    if (movement.horizontal === 0 && movement.vertical === 0) {
  this.sprite.setVelocity(0, 0)

  const idleFrames = {
    down: 0,
    right: 3,
    left: 6,
    up: 9,
  }

  this.sprite.setFrame(idleFrames[this.facing])
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

    const idleFrames = {
      down: 0,
      right: 6,
      left: 3,
      up: 9,
    }

    this.sprite.setFrame(idleFrames[this.facing])

    const walkingFrames = {
      down: [0, 1, 2],
      left: [3, 4, 5],
      right: [6, 7, 8],
      up: [9, 10, 11],
    }

    const frame =
      walkingFrames[this.facing][
        Math.floor(this.sprite.scene.time.now / 150) % 3
      ]

    this.sprite.setFrame(frame)
  }

  getFacing(): "up" | "down" | "left" | "right" {
    return this.facing
  }

  setCharacter(character: PlayerCharacter): void {
    this.character = character
    this.sprite.setTexture(character)
    this.sprite.setFrame(0)
  }
}
