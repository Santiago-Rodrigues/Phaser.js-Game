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

    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setScale(0.28)

    this.sprite.setCollideWorldBounds(true)

    this.controls = new Controls(scene)

    this.character = character

    this.setCenteredFrame(0)
    this.sprite.setVelocity(0, 0)
  }

  getCharacter(): PlayerCharacter {
    return this.character
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

    if (!center) {
      this.sprite.setFrame(frame)
      return
    }

    this.sprite.setFrame(frame)
    this.sprite.setOrigin(center.x / 341, center.y / 256)
  }

  update(): void {
    const movement = this.controls.getMovement()

    if (movement.horizontal === 0 && movement.vertical === 0) {
      this.sprite.setVelocity(0, 0)

      const idleFrames = {
        down: 0,
        right: 6,
        left: 3,
        up: 9,
      }

      this.setCenteredFrame(idleFrames[this.facing])
      return
    }

    const length = Math.hypot(movement.horizontal, movement.vertical)
    const horizontal = movement.horizontal / length
    const vertical = movement.vertical / length

    this.sprite.setVelocity(
      horizontal * this.speed,
      vertical * this.speed,
    )

    if (Math.abs(horizontal) > Math.abs(vertical)) {
      this.facing = horizontal > 0 ? "right" : "left"
    } else {
      this.facing = vertical > 0 ? "down" : "up"
    }

    const walkingFrames = {
      down: [0, 1, 2],
      right: [6, 7, 8],
      left: [3, 4, 5],
      up: [9, 10, 11],
    }

    const frameIndex =
      Math.floor(this.sprite.scene.time.now / 150) % 3

    this.setCenteredFrame(walkingFrames[this.facing][frameIndex])
  }

  getFacing(): "up" | "down" | "left" | "right" {
    return this.facing
  }

  setCharacter(character: PlayerCharacter): void {
    this.character = character
    this.sprite.setTexture(character)
    this.setCenteredFrame(0)
  }
}
