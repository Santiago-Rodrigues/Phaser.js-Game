import { Scene } from "phaser"
import { Bullet } from "./bullets"
import { Player } from "./player"
import { Slime } from "./slime"
import { Companion } from "./companion"

type MansionMap = "boss" | "corridor1" | "corridor2"
type MansionSpawn =
  | "bossBottom"
  | "corridor1Top"
  | "corridor1Bottom"
  | "corridor2Top"

export class GameScene extends Scene {
  private player!: Player
  private rian!: Companion
  private lira!: Companion
  private slime?: Slime
  private readonly bullets: Bullet[] = []
  private attackKey!: Phaser.Input.Keyboard.Key
  private nextShotAt = 0
  private collisionLayer!:
    | Phaser.Tilemaps.TilemapLayer
    | Phaser.Tilemaps.TilemapGPULayer
  private currentMap: MansionMap = "boss"
  private transitioning = false
  private playerLayer!: Phaser.GameObjects.Container
  private projectileLayer!: Phaser.GameObjects.Container

  constructor() {
    super("GameScene")
  }

  init(data: { map?: MansionMap; spawn?: MansionSpawn }): void {
    this.currentMap = data.map ?? "boss"
    this.transitioning = false
    this.bullets.length = 0

    if (data.spawn) {
      this.registry.set("mansionSpawn", data.spawn)
    }
  }

  preload(): void {
    this.load.image("mansion-collider", "assets/mansion/bloco_colisao.png")
    this.load.image("kael", "assets/protagonists/Kael.png")
    this.load.image("rian", "assets/protagonists/Rian.png")
    this.load.image("slime", "assets/npcs/enemies/Slime.png")

    this.load.image("lira", "assets/protagonists/Lira.png")

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

    if (!keyboard) {
      throw new Error("O teclado não está disponível nesta cena.")
    }

    this.attackKey = keyboard.addKey("SPACE")

    this.createMap()
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

    this.player = new Player(this, spawn.x, spawn.y)

    this.rian = new Companion(this, spawn.x - 60, spawn.y + 55, "rian", -1)

    this.lira = new Companion(this, spawn.x + 60, spawn.y + 55, "lira", 1)
    this.playerLayer.add(this.rian.sprite)
    this.playerLayer.add(this.lira.sprite)
    this.playerLayer.add(this.player.sprite)

    this.physics.add.collider(this.player.sprite, this.collisionLayer)
    this.physics.add.collider(this.rian.sprite, this.collisionLayer)
    this.physics.add.collider(this.lira.sprite, this.collisionLayer)

    this.physics.add.collider(this.rian.sprite, this.lira.sprite)

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

    this.physics.add.overlap(this.player.sprite, zone, () => {
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
    })
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
    this.player.update()
    this.rian.update(this.player.sprite)
    this.lira.update(this.player.sprite)

    if (this.slime?.sprite.active) {
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
}
