import { Scene } from "phaser"
import { Bullet } from "./bullets"
import { Player, type PlayerCharacter } from "./player"
import { Slime } from "./slime"
import { Companion } from "./companion"

type PartyCharacter = "kael" | "rian" | "lira"
type MansionMap = "boss" | "corridor1" | "corridor2"
type MansionSpawn =
  | "bossBottom"
  | "corridor1Top"
  | "corridor1Bottom"
  | "corridor2Top"

export class GameScene extends Scene {
  private player!: Player
  private companions: Companion[] = []
  private partyCharacter: PlayerCharacter | null = null
  private slime?: Slime
  private readonly bullets: Bullet[] = []
  private attackKey!: Phaser.Input.Keyboard.Key
  private interactKey!: Phaser.Input.Keyboard.Key
  private nextShotAt = 0
  private collisionLayer!:
    | Phaser.Tilemaps.TilemapLayer
    | Phaser.Tilemaps.TilemapGPULayer
  private currentMap: MansionMap = "boss"
  private transitioning = false
  private playerLayer!: Phaser.GameObjects.Container
  private projectileLayer!: Phaser.GameObjects.Container
  private activeTransition?: { target: string; label: string }
  private transitionZones: Array<{
    zone: Phaser.GameObjects.Zone
    label: Phaser.GameObjects.Text
    target: string
  }> = []
  private interactWasDown = false

  constructor() {
    super("GameScene")
  }

  init(data: { map?: MansionMap; spawn?: MansionSpawn }): void {
    this.currentMap = data.map ?? "boss"
    this.transitioning = false
    this.bullets.length = 0

    this.companions = []
    this.partyCharacter = null
    this.transitionZones = []
    this.interactWasDown = false

    if (data.spawn) {
      this.registry.set("mansionSpawn", data.spawn)
    }
  }

  preload(): void {
    this.load.image("mansion-collider", "assets/mansion/bloco_colisao.png")
    this.load.spritesheet("kael", "assets/protagonists/Kael/walk.png", {
      frameWidth: 64,
      frameHeight: 64,
    })

    this.load.spritesheet("rian", "assets/protagonists/Rian/walk.png", {
      frameWidth: 64,
      frameHeight: 64,
    })

    this.load.spritesheet("lira", "assets/protagonists/Lira/walk.png", {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet("slime", "assets/npcs/enemies/Slime.png", {
      frameWidth: 98,
      frameHeight: 79,
    })

    this.load.spritesheet("goblin", "assets/npcs/enemies/Goblin.png", {
      frameWidth: 115,
      frameHeight: 135,
    })

    if (this.currentMap === "boss") {
      this.load.image("boss-background", "assets/mansion/sala_boss.png")
      this.load.tilemapTiledJSON(
        "mansion-boss",
        "assets/mansion/sala_boss.json",
      )
    } else if (this.currentMap === "corridor1") {
      this.load.image("corridor1-background", "assets/mansion/corredor1.png")
      this.load.tilemapTiledJSON(
        "mansion-corridor1",
        "assets/mansion/corredor1.json",
      )
    } else {
      this.load.image("corridor2-background", "assets/mansion/corredor2.png")
      this.load.tilemapTiledJSON(
        "mansion-corridor2",
        "assets/mansion/corredor2.json",
      )
    }
  }

  create(): void {
    this.playerLayer = this.add.container()
    this.projectileLayer = this.add.container()
    this.cameras.main.setBackgroundColor("#101820")

    const keyboard = this.input.keyboard

    if (!this.registry.has("activeCharacter")) {
      this.registry.set("activeCharacter", "kael")
    }

    if (!keyboard) {
      throw new Error("O teclado não está disponível nesta cena.")
    }

    this.attackKey = keyboard.addKey("SPACE")
    this.interactKey = keyboard.addKey("E")

    this.createMap()

    keyboard.on("keydown-M", () => {
      this.scene.pause("GameScene")
      this.scene.launch("PartyMenu")
    })
  }

  private createMap(): void {
    let mapKey = "mansion-boss"
    let backgroundKey = "boss-background"
    let collisionName = "colisoes"
    let tilesetName = "colisao"

    if (this.currentMap === "corridor1") {
      mapKey = "mansion-corridor1"
      backgroundKey = "corridor1-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    } else if (this.currentMap === "corridor2") {
      mapKey = "mansion-corridor2"
      backgroundKey = "corridor2-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    }

    const map = this.make.tilemap({ key: mapKey })
    const tileset = map.addTilesetImage(tilesetName, "mansion-collider")

    if (!tileset) {
      throw new Error(`Não foi possível carregar o tileset ${tilesetName}.`)
    }

    const background = this.add.image(0, 0, backgroundKey).setOrigin(0)
    background.setDisplaySize(map.widthInPixels, map.heightInPixels)
    background.setDepth(-10)

    this.collisionLayer = map.createLayer(collisionName, tileset, 0, 0)

    if (!this.collisionLayer) {
      throw new Error(`Não foi possível criar a camada ${collisionName}.`)
    }

    this.collisionLayer.setCollision([1])
    this.collisionLayer.setVisible(false)

    const spawn = this.getSpawnPosition()

    const activeCharacter = this.registry.get(
      "activeCharacter",
    ) as PlayerCharacter

    this.player = new Player(this, spawn.x, spawn.y, activeCharacter)

    this.syncParty(spawn.x, spawn.y)

    this.playerLayer.add(this.player.sprite)

    this.physics.add.collider(this.player.sprite, this.collisionLayer)

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    if (this.currentMap === "boss") {
      this.cameras.main.stopFollow()
    } else {
      this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
      this.cameras.main.setRoundPixels(true)
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.player.sprite.setCollideWorldBounds(true)

    if (this.currentMap === "boss") {
      this.slime = new Slime(this, 400, 320)
      this.playerLayer.add(this.slime.sprite)
      this.physics.add.collider(this.slime.sprite, this.collisionLayer)
      this.physics.add.collider(this.player.sprite, this.slime.sprite)
    }

    this.createTransitionZones()
  }

  private syncParty(spawnX: number, spawnY: number): void {
    const activeCharacter = this.registry.get(
      "activeCharacter",
    ) as PlayerCharacter

    if (this.partyCharacter === activeCharacter) {
      return
    }

    this.companions.forEach((companion) => {
      companion.sprite.destroy()
    })
    this.companions = []

    this.partyCharacter = activeCharacter

    const party: Array<"kael" | "rian" | "lira"> = ["kael", "rian", "lira"]

    const companions = party.filter(
      (character) => character !== activeCharacter,
    )

    companions.forEach((character, index) => {
      const side: -1 | 1 = index === 0 ? -1 : 1

      const companion = new Companion(
        this,
        spawnX + side * 60,
        spawnY + 55,
        character,
        side,
      )

      this.companions.push(companion)
      this.playerLayer.add(companion.sprite)
      this.physics.add.collider(companion.sprite, this.collisionLayer)
    })

    if (this.companions.length === 2) {
      this.physics.add.collider(
        this.companions[0].sprite,
        this.companions[1].sprite,
      )
    }
  }

  private getSpawnPosition(): { x: number; y: number } {
    const spawn = this.registry.get("mansionSpawn") as MansionSpawn | undefined

    if (this.currentMap === "boss") {
      return spawn === "bossBottom" ? { x: 400, y: 530 } : { x: 400, y: 520 }
    }

    if (this.currentMap === "corridor1") {
      if (spawn === "corridor1Top") {
        return { x: 720, y: 180 }
      }

      if (spawn === "corridor1Bottom") {
        return { x: 720, y: 1440 }
      }
    }

    if (spawn === "corridor2Top") {
      return { x: 400, y: 300 }
    }

    return { x: 800, y: 1500 }
  }

  private createTransitionZones(): void {
    if (this.currentMap === "boss") {
      this.createZone(400, 580, 220, 40, "bossToCorridor1")
    }

    if (this.currentMap === "corridor1") {
      this.createZone(720, 80, 128, 80, "corridor1ToBoss")

      this.createZone(720, 1540, 128, 120, "corridor1ToCorridor2")
    }

    if (this.currentMap === "corridor2") {
      this.createZone(400, 180, 300, 80, "corridor2ToCorridor1")
    }
  }

  private createZone(
    x: number,
    y: number,
    width: number,
    height: number,
    target: string,
  ): void {
    const zone = this.add.zone(x, y, width, height)
    this.physics.add.existing(zone, true)

    const label = this.add
      .text(x, y - height / 2 - 24, "E  Interagir", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#20263a",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false)

    this.transitionZones.push({ zone, label, target })
  }

  private updateTransitionInteraction(): void {
    let closestTarget: string | undefined
    let closestPrompt: Phaser.GameObjects.Text | undefined
    let closestDistance = Number.POSITIVE_INFINITY

    this.transitionZones.forEach(({ zone, label, target }) => {
      const bounds = zone.getBounds()
      const isInside = bounds.contains(
        this.player.sprite.x,
        this.player.sprite.y,
      )

      label.setVisible(isInside)

      if (isInside) {
        const distanceX = this.player.sprite.x - zone.x
        const distanceY = this.player.sprite.y - zone.y
        const distance = Math.hypot(distanceX, distanceY)

        if (distance < closestDistance) {
          closestDistance = distance
          closestTarget = target
          closestPrompt = label
        }
      }
    })

    this.activeTransition = closestTarget
      ? { target: closestTarget, label: closestPrompt?.text ?? "E  Interagir" }
      : undefined
  }

  private transitionTo(target: string): void {
    if (this.transitioning) {
      return
    }

    this.transitioning = true

    if (target === "bossToCorridor1") {
      this.scene.restart({
        map: "corridor1",
        spawn: "corridor1Top",
      })
    } else if (target === "corridor1ToBoss") {
      this.scene.restart({
        map: "boss",
        spawn: "bossBottom",
      })
    } else if (target === "corridor1ToCorridor2") {
      this.scene.restart({
        map: "corridor2",
        spawn: "corridor2Top",
      })
    } else if (target === "corridor2ToCorridor1") {
      this.scene.restart({
        map: "corridor1",
        spawn: "corridor1Bottom",
      })
    }
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

    this.physics.add.collider(bullet.sprite, this.collisionLayer, () => {
      bullet.sprite.disableBody(true, true)
    })

    if (this.slime?.sprite.active) {
      this.physics.add.overlap(bullet.sprite, this.slime.sprite, () => {
        if (!bullet.sprite.active) {
          return
        }

        bullet.sprite.disableBody(true, true)
        this.slime?.takeDamage()
      })
    }

    this.projectileLayer.add(bullet.sprite)
  }

  update(): void {
    const activeCharacter = this.registry.get(
      "activeCharacter",
    ) as PlayerCharacter

    if (this.player.getCharacter() !== activeCharacter) {
      this.player.setCharacter(activeCharacter)
    }

    this.player.update()
    if (this.partyCharacter !== activeCharacter) {
      this.syncParty(this.player.sprite.x, this.player.sprite.y)
    }

    this.companions.forEach((companion) => {
      companion.update(this.player.sprite)
    })

    if (this.slime?.sprite.active) {
      this.slime.update(this.player.sprite)
    }

    if (this.attackKey.isDown) {
      this.shoot()
    }

    this.updateTransitionInteraction()

    const interactPressed = this.interactKey.isDown

    if (
      this.activeTransition &&
      interactPressed &&
      !this.interactWasDown
    ) {
      this.transitionTo(this.activeTransition.target)
    }

    this.interactWasDown = interactPressed

    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index]
      bullet.update(this)

      if (!bullet.sprite.active) {
        this.bullets.splice(index, 1)
      }
    }
  }
}
