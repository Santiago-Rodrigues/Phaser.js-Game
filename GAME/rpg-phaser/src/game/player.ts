import { Controls } from "./controls"

export type PlayerCharacter = "kael" | "rian" | "lira"
export class Player {
  static readonly hurtDuration = 325
  readonly sprite: Phaser.Physics.Arcade.Sprite
  character: PlayerCharacter

  private readonly controls: Controls
  private readonly speed = 800
  private hurtStartedAt = 0
  private invulnerableUntil = 0
  private facing: "up" | "down" | "left" | "right" = "down"

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    character: PlayerCharacter,
  ) {
    this.sprite = scene.physics.add.sprite(x, y, character)

    this.sprite.setOrigin(0.5, 0.5)
    this.sprite.setScale(1.5)

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
    this.sprite.setFrame(frame)
    this.sprite.setOrigin(0.5, 0.5)
  }

  playHurt(invulnerableUntil: number): void {
    this.hurtStartedAt = this.sprite.scene.time.now
    this.invulnerableUntil = invulnerableUntil
    this.sprite.setVelocity(0, 0)
    this.updateHurt()
  }

  private updateHurt(): boolean {
    const now = this.sprite.scene.time.now
    const elapsed = now - this.hurtStartedAt

    if (now < this.invulnerableUntil) {
      this.sprite.setAlpha(Math.floor(elapsed / 100) % 2 === 0 ? 0.35 : 1)

      if (elapsed < Player.hurtDuration) {
        this.sprite.setTexture(`${this.character}-hurt`, Math.floor(elapsed / 25))
        return true
      }
    } else if (this.invulnerableUntil !== 0) {
      this.sprite.setAlpha(1)
      this.invulnerableUntil = 0
    }

    if (this.sprite.texture.key !== this.character) {
      this.sprite.setTexture(this.character)
    }
    return false
  }

  update(): void {
    if (this.updateHurt()) {
      return
    }

    const movement = this.controls.getMovement()

    if (movement.horizontal === 0 && movement.vertical === 0) {
      this.sprite.setVelocity(0, 0)

      const idleFrames = {
        down: 26,
        right: 39,
        left: 13,
        up: 0,
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
      down: [26, 27, 28, 29, 30, 31, 32, 33, 34],
      right: [39, 40, 41, 42, 43, 44, 45, 46, 47],
      left: [13, 14, 15, 16, 17, 18, 19, 20, 21],
      up: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    }

    const frameIndex =
      Math.floor(this.sprite.scene.time.now / 150) % 9

    this.setCenteredFrame(walkingFrames[this.facing][frameIndex])
  }

  getFacing(): "up" | "down" | "left" | "right" {
    return this.facing
  }

  setCharacter(character: PlayerCharacter): void {
    this.character = character
    this.sprite.setTexture(character)
    this.sprite.setScale(1.5)
    this.setCenteredFrame(0)
  }
}
