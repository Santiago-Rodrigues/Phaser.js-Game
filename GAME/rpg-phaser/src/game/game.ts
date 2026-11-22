import { Scene } from "phaser"
import { Bullet } from "./bullets"
import { Player, type PlayerCharacter } from "./player"
import { Slime } from "./slime"
import { Companion } from "./companion"

type PartyCharacter = "kael" | "rian" | "lira"
type GameMap =
  | "boss"
  | "corridor1"
  | "corridor2"
  | "forest1"
  | "forest2"
  | "forest3"
  | "forest4"
  | "mansionEntrance"
type MansionSpawn =
  | "bossBottom"
  | "corridor1Top"
  | "corridor1Bottom"
  | "corridor2Top"
  | "forest1Start"
  | "forest1FromForest2"
  | "forest2FromForest1"
  | "forest2FromForest3"
  | "forest3FromForest2"
  | "forest3FromForest4"
  | "forest4FromForest3"
  | "mansionEntranceFromForest4"

export class GameScene extends Scene {
  private player!: Player
  private companions: Companion[] = []
  private partyCharacter: PlayerCharacter | null = null
  private readonly slimes: Slime[] = []
  private readonly bullets: Bullet[] = []
  private attackKey!: Phaser.Input.Keyboard.Key
  private interactKey!: Phaser.Input.Keyboard.Key
  private nextShotAt = 0
  private collisionLayer!:
    | Phaser.Tilemaps.TilemapLayer
    | Phaser.Tilemaps.TilemapGPULayer
  private currentMap: GameMap = "forest1"
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

  init(data: { map?: GameMap; spawn?: MansionSpawn }): void {
    this.currentMap = data.map ?? "forest1"
    this.transitioning = false
    this.bullets.length = 0
    this.slimes.length = 0

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
    this.load.image("forest1-background", "assets/forest/floresta1.png")
    this.load.image("forest2-background", "assets/forest/floresta2.png")
    this.load.image("forest3-background", "assets/forest/floresta3.png")
    this.load.image("forest4-background", "assets/forest/floresta4.png")
    this.load.image("mansion-entrance-background", "assets/forest/entrada_mansao.png")
    this.load.tilemapTiledJSON("forest1", "assets/forest/forest1.json")
    this.load.tilemapTiledJSON("forest2", "assets/forest/forest2.json")
    this.load.tilemapTiledJSON("forest3", "assets/forest/forest3.json")
    this.load.tilemapTiledJSON("forest4", "assets/forest/forest4.json")
    this.load.tilemapTiledJSON("mansion-entrance", "assets/forest/entrada_mansion.json")
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

    if (
      this.currentMap === "forest1" ||
      this.currentMap === "forest2" ||
      this.currentMap === "forest3" ||
      this.currentMap === "forest4" ||
      this.currentMap === "mansionEntrance"
    ) {
      // Forest and mansion entrance maps were loaded above.
    } else if (this.currentMap === "boss") {
      this.load.image("boss-background", "assets/mansion/catacombs/sala_boss.png")
      this.load.tilemapTiledJSON(
        "mansion-boss",
        "assets/mansion/sala_boss.json",
      )
    } else if (this.currentMap === "corridor1") {
      this.load.image("corridor1-background", "assets/mansion/catacombs/corredor1.png")
      this.load.tilemapTiledJSON(
        "mansion-corridor1",
        "assets/mansion/corredor1.json",
      )
    } else {
      this.load.image("corridor2-background", "assets/mansion/catacombs/corredor2.png")
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
    if (!this.registry.has("partyJoined")) {
      this.registry.set("partyJoined", false)
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

    if (this.currentMap === "forest1") {
      mapKey = "forest1"
      backgroundKey = "forest1-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    } else if (this.currentMap === "forest2") {
      mapKey = "forest2"
      backgroundKey = "forest2-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    } else if (this.currentMap === "forest3") {
      mapKey = "forest3"
      backgroundKey = "forest3-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    } else if (this.currentMap === "forest4") {
      mapKey = "forest4"
      backgroundKey = "forest4-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    } else if (this.currentMap === "mansionEntrance") {
      mapKey = "mansion-entrance"
      backgroundKey = "mansion-entrance-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    } else if (this.currentMap === "corridor1") {
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

    const isForestMap =
      this.currentMap === "forest1" ||
      this.currentMap === "forest2" ||
      this.currentMap === "forest3" ||
      this.currentMap === "forest4" ||
      this.currentMap === "mansionEntrance"

    if (isForestMap) {
      const background = this.add.image(0, 0, backgroundKey).setOrigin(0)
      background.setDisplaySize(map.widthInPixels, map.heightInPixels)
      background.setDepth(-10)
    } else {
      const background = this.add.image(0, 0, backgroundKey).setOrigin(0)
      background.setDisplaySize(map.widthInPixels, map.heightInPixels)
      background.setDepth(-10)
    }

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
      this.spawnSlimes([{ x: 400, y: 320 }])
    } else if (this.currentMap === "forest2") {
      this.spawnForestSlimes([
        [532, 483, 158, 66],
      ])
    } else if (this.currentMap === "forest3") {
      this.spawnForestSlimes([
        [290, 515, 176, 67],
        [529, 381, 171, 85],
      ])
    } else if (this.currentMap === "forest4") {
      this.spawnForestSlimes([
        [219, 490, 39, 13],
        [543, 532, 186, 83],
      ])
    } else if (this.currentMap === "mansionEntrance") {
      this.spawnForestSlimes([
        [450, 650, 40, 40],
        [540, 650, 40, 40],
      ])
    }

    this.createTransitionZones()
  }

  private spawnSlimes(points: Array<{ x: number; y: number }>): void {
    points.forEach((point) => {
      const slime = new Slime(this, point.x, point.y)
      this.slimes.push(slime)
      this.playerLayer.add(slime.sprite)
      this.physics.add.collider(slime.sprite, this.collisionLayer)
      this.physics.add.collider(this.player.sprite, slime.sprite)
    })
  }

  private spawnForestSlimes(
    rects: Array<[number, number, number, number]>,
  ): void {
    const scale = 1600 / 768
    const points = rects.map(([x, y, width, height]) => ({
      x: (x + width / 2) * scale,
      y: (y + height / 2) * scale,
    }))
    this.spawnSlimes(points)
  }

  private syncParty(spawnX: number, spawnY: number): void {
    const activeCharacter = this.registry.get(
      "activeCharacter",
    ) as PlayerCharacter
    const partyJoined = this.registry.get("partyJoined") === true

    if (!partyJoined) {
      this.companions.forEach((companion) => companion.sprite.destroy())
      this.companions = []
      this.partyCharacter = activeCharacter
      return
    }

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
    const scale = 1600 / 768

    const forestCenter = (
      x: number,
      y: number,
      width: number,
      height: number,
    ): { x: number; y: number } => ({
      x: (x + width / 2) * scale,
      y: (y + height / 2) * scale,
    })

    if (this.currentMap === "forest1") {
      return spawn === "forest1FromForest2"
        ? forestCenter(382, 700, 50, 30)
        : forestCenter(165, 232, 168, 61)
    }

    if (this.currentMap === "forest2") {
      if (spawn === "forest2FromForest3") {
        return forestCenter(223, 118, 170, 81)
      }
      return forestCenter(353, 125, 150, 62)
    }

    if (this.currentMap === "forest3") {
      if (spawn === "forest3FromForest4") {
        return forestCenter(629, 542, 176, 88)
      }
      return forestCenter(231, 113, 110, 64)
    }

    if (this.currentMap === "forest4") {
      return forestCenter(533, 165, 164, 99)
    }

    if (this.currentMap === "mansionEntrance") {
      return forestCenter(396, 37, 95, 71)
    }

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
    if (this.currentMap === "forest1") {
      this.createZone(382, 700, 50, 30, "forest1ToForest2")
    }

    if (this.currentMap === "forest2") {
      this.createZone(353, 125, 150, 62, "forest2ToForest1")
      this.createZone(200, 673, 181, 101, "forest2ToForest3")
    }

    if (this.currentMap === "forest3") {
      this.createZone(231, 113, 110, 64, "forest3ToForest2")
      this.createZone(629, 542, 176, 88, "forest3ToForest4")
    }

    if (this.currentMap === "forest4") {
      this.createZone(629, 542, 176, 88, "forest4ToForest3")
      this.createZone(508, 638, 166, 99, "forest4ToMansionEntrance")
    }

    if (this.currentMap === "mansionEntrance") {
      this.createZone(396, 37, 95, 71, "mansionEntranceToForest4")
      this.createZone(636, 215, 55, 63, "mansionEntranceToMansion")
      this.createZone(434, 653, 137, 99, "mansionParty")
    }

    if (this.currentMap === "boss") {
      this.createZone(400, 550, 220, 40, "bossToCorridor1")
    }

    if (this.currentMap === "corridor1") {
      this.createZone(720, 150, 128, 80, "corridor1ToBoss")

      this.createZone(720, 1540, 135, 120, "corridor1ToCorridor2")
    }

    if (this.currentMap === "corridor2") {
      this.createZone(400, 250, 300, 80, "corridor2ToMansionEntrance")
    }
  }

  private createZone(
    x: number,
    y: number,
    width: number,
    height: number,
    target: string,
  ): void {
    const isSourcePixelZone =
      this.currentMap === "forest1" ||
      this.currentMap === "forest2" ||
      this.currentMap === "forest3" ||
      this.currentMap === "forest4" ||
      this.currentMap === "mansionEntrance"
    const scale = isSourcePixelZone ? 1600 / 768 : 1
    const zoneX = isSourcePixelZone ? (x + width / 2) * scale : x
    const zoneY = isSourcePixelZone ? (y + height / 2) * scale : y
    const zoneWidth = isSourcePixelZone ? width * scale : width
    const zoneHeight = isSourcePixelZone ? height * scale : height

    const zone = this.add.zone(
      zoneX,
      zoneY,
      zoneWidth,
      zoneHeight,
    )
    this.physics.add.existing(zone, true)

    const label = this.add
      .text(zoneX, zoneY - zoneHeight / 2 - 24, "E  Interagir", {
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

    if (target === "forest1ToForest2") {
      this.scene.restart({
        map: "forest2",
        spawn: "forest2FromForest1",
      })
      return
    }

    if (target === "forest2ToForest1") {
      this.scene.restart({
        map: "forest1",
        spawn: "forest1FromForest2",
      })
      return
    }

    if (target === "forest2ToForest3") {
      this.scene.restart({
        map: "forest3",
        spawn: "forest3FromForest2",
      })
      return
    }

    if (target === "forest3ToForest2") {
      this.scene.restart({
        map: "forest2",
        spawn: "forest2FromForest3",
      })
      return
    }

    if (target === "forest3ToForest4") {
      this.scene.restart({
        map: "forest4",
        spawn: "forest4FromForest3",
      })
      return
    }

    if (target === "forest4ToForest3") {
      this.scene.restart({
        map: "forest3",
        spawn: "forest3FromForest4",
      })
      return
    }

    if (target === "forest4ToMansionEntrance") {
      this.scene.restart({
        map: "mansionEntrance",
        spawn: "mansionEntranceFromForest4",
      })
      return
    }

    if (target === "mansionEntranceToForest4") {
      this.scene.restart({
        map: "forest4",
        spawn: "mansionEntranceFromForest4",
      })
      return
    }

    if (target === "mansionParty") {
      this.transitioning = false
      return
    }

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
      return
    }

    if (target === "corridor2ToMansionEntrance") {
      this.scene.restart({
        map: "mansionEntrance",
        spawn: "mansionEntranceFromForest4",
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

    this.slimes.forEach((slime) => {
      if (slime.sprite.active) {
        this.physics.add.overlap(bullet.sprite, slime.sprite, () => {
          if (!bullet.sprite.active) {
            return
          }

          bullet.sprite.disableBody(true, true)
          slime.takeDamage()
        })
      }
    })

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

    this.slimes.forEach((slime) => {
      if (slime.sprite.active) {
        slime.update(this.player.sprite)
      }
    })

    if (
      this.currentMap === "mansionEntrance" &&
      this.registry.get("partyJoined") !== true &&
      this.slimes.length === 2 &&
      this.slimes.every((slime) => !slime.sprite.active)
    ) {
      this.registry.set("partyJoined", true)
      this.syncParty(
        this.player.sprite.x,
        this.player.sprite.y,
      )
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
