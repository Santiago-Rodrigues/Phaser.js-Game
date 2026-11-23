import { Input, Scene } from "phaser"
import { Bullet } from "./bullets"
import { attackSheets, Player, type PlayerCharacter } from "./player"
import { Slime } from "./slime"
import { Companion } from "./companion"

type GameMap =
  | "boss"
  | "corridor1"
  | "corridor2"
  | "forest1"
  | "forest2"
  | "forest3"
  | "mansionEntrance"
  | "mansion"
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
  | "forest3FromMansionEntrance"
  | "mansionEntranceFromForest3"
  | "mansionEntranceFromInterior"
  | "mansionReception"
  | "mansionReceptionFromHall"
  | "mansionHallFromReception"
  | "mansionHallFromBedroom"
  | "mansionLeftDoorFromBedroom"
  | "mansionBedroom"
  | "mansionBedroomFromLeftDoor"

export class GameScene extends Scene {
  private player!: Player
  private companions: Companion[] = []
  private partyCharacter: PlayerCharacter | null = null
  private readonly slimes: Slime[] = []
  private readonly bullets: Bullet[] = []
  private attackKey!: Phaser.Input.Keyboard.Key
  private interactKey!: Phaser.Input.Keyboard.Key
  private readonly maxPlayerHealth = 5
  private playerHealth = this.maxPlayerHealth
  private healthHearts: Phaser.GameObjects.Image[] = []
  private nextContactDamageAt = 0
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
    this.nextContactDamageAt = 0
    this.activeTransition = undefined
    this.bullets.length = 0
    this.slimes.length = 0

    this.companions = []
    this.partyCharacter = null
    this.transitionZones = []
    this.interactWasDown = true

    if (data.spawn) {
      this.registry.set("mansionSpawn", data.spawn)
    }
  }

  preload(): void {
    this.load.image("kael-projectile", "assets/protagonists/Kael/fireBall.png")
    this.load.image("lira-projectile", "assets/protagonists/Lira/magic.png")
    this.load.image("player-heart", "assets/protagonists/heart.png")
    this.load.image("enemy-health-frame", "assets/npcs/enemyBar.png")
    this.load.image("mansion-collider", "assets/mansion/bloco_colisao.png")
    this.load.image("forest1-background", "assets/forest/floresta1.png")
    this.load.image("forest2-background", "assets/forest/floresta2.png")
    this.load.image("forest3-background", "assets/forest/floresta3.png")
    this.load.image("mansion-entrance-background", "assets/forest/entrada_mansao.png")
    this.load.tilemapTiledJSON("forest1", "assets/forest/forest1.json")
    this.load.tilemapTiledJSON("forest2", "assets/forest/forest2.json")
    this.load.tilemapTiledJSON("forest3", "assets/forest/forest3.json")
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

    for (const name of ["Kael", "Rian", "Lira"]) {
      this.load.spritesheet(`${name.toLowerCase()}-hurt`, `assets/protagonists/${name}/hurt.png`, {
        frameWidth: 64,
        frameHeight: 64,
      })
    }

    for (const [character, { path, size }] of Object.entries(attackSheets)) {
      this.load.spritesheet(`${character}-attack`, `assets/protagonists/${path}`, {
        frameWidth: size,
        frameHeight: size,
      })
    }

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
      this.currentMap === "mansionEntrance"
    ) {
      // Forest and mansion entrance maps were loaded above.
    } else if (this.currentMap === "mansion") {
      this.load.image("mansion-background", "assets/mansion/mansao.png")
      this.load.tilemapTiledJSON("mansion", "assets/mansion/mansion.json")
    } else if (this.currentMap === "boss") {
      this.load.image("boss-background", "assets/mansion/catacombs/sala_boss.png")
      this.load.tilemapTiledJSON(
        "mansion-boss",
        "assets/mansion/catacombs/sala_boss.json",
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
    this.healthHearts = Array.from({ length: this.maxPlayerHealth }, (_, index) =>
      this.add.image(22 + index * 23, 22, "player-heart")
        .setDisplaySize(36, 36)
        .setScrollFactor(0)
        .setDepth(200),
    )
    this.updatePlayerHealthHud()

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
    } else if (this.currentMap === "mansionEntrance") {
      mapKey = "mansion-entrance"
      backgroundKey = "mansion-entrance-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "collider"
    } else if (this.currentMap === "mansion") {
      mapKey = "mansion"
      backgroundKey = "mansion-background"
      collisionName = "Camada de Blocos 2"
      tilesetName = "bloco_colisao"
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
        [497, 512, 158, 66],
      ])
    } else if (this.currentMap === "forest3") {
      this.spawnForestSlimes([
        [290, 515, 176, 67],
        [529, 381, 171, 85],
      ])
    } else if (this.currentMap === "mansionEntrance") {
      this.spawnForestSlimes([
        [450, 650, 40, 40],
        [525, 650, 40, 40],
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
      this.physics.add.collider(this.player.sprite, slime.sprite, () => {
        this.takeContactDamage(slime)
      })
    })
  }

  private updatePlayerHealthHud(): void {
    this.healthHearts.forEach((heart, index) => {
      heart.setAlpha(index < this.playerHealth ? 1 : 0.25)
    })
  }

  private takeContactDamage(slime: Slime): void {
    if (this.transitioning || this.time.now < this.nextContactDamageAt) {
      return
    }

    this.playerHealth -= 1
    this.updatePlayerHealthHud()
    this.nextContactDamageAt = this.time.now + 1000
    this.player.playHurt(this.nextContactDamageAt)
    slime.stopUntil(this.nextContactDamageAt)

    if (this.playerHealth === 0) {
      this.transitioning = true
      this.time.delayedCall(Player.hurtDuration, () => {
        this.playerHealth = this.maxPlayerHealth
        this.scene.restart({ map: this.currentMap })
      })
    }
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

    if (!partyJoined || this.partyCharacter === activeCharacter) {
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
        return forestCenter(200, 673, 181, 101)
      }
      return forestCenter(269,99,130,85)
    }

    if (this.currentMap === "forest3") {
      if (spawn === "forest3FromMansionEntrance") {
        return forestCenter(629, 542, 176, 88)
      }
      return forestCenter(231, 113, 110, 64)
    }

    if (this.currentMap === "mansionEntrance") {
      return spawn === "mansionEntranceFromInterior"
        ? { x: 1382, y: 600 }
        : forestCenter(396, 37, 95, 71)
    }

    if (this.currentMap === "mansion") {
      switch (spawn) {
        case "mansionReceptionFromHall":
          return { x: 2064, y: 880 }
        case "mansionHallFromReception":
          return { x: 1824, y: 400 }
        case "mansionHallFromBedroom":
          return { x: 1240, y: 400 }
        case "mansionLeftDoorFromBedroom":
          return { x: 368, y: 1120 }
        case "mansionBedroom":
        case "mansionBedroomFromLeftDoor":
          return { x: 480, y: 580 }
        default:
          return { x: 2544, y: 1030 }
      }
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
      this.createZone(269,99,130,85, "forest2ToForest1")
      this.createZone(200, 673, 181, 101, "forest2ToForest3")
    }

    if (this.currentMap === "forest3") {
      this.createZone(231, 113, 110, 64, "forest3ToForest2")
      this.createZone(629, 542, 176, 88, "forest3ToMansionEntrance")
    }

    if (this.currentMap === "mansionEntrance") {
      this.createZone(396, 37, 95, 71, "mansionEntranceToForest3")
      this.createZone(636, 215, 55, 63, "mansionEntranceToMansion")
    }

    if (this.currentMap === "mansion") {
      this.createZone(2472, 930, 144, 56, "mansionToOutside", "E  Sair da mansão")
      this.createZone(1616, 1000, 128, 64, "mansionReceptionDesk", "E  Falar na recepção")
      this.createZone(2000, 784, 128, 56, "mansionReceptionToHall", "E  Ir ao corredor")
      this.createZone(1680, 376, 128, 52, "mansionHallToReception", "E  Voltar à recepção")
      this.createZone(1080, 376, 128, 52, "mansionHallToBedroom", "E  Entrar no quarto")
      this.createZone(320, 1024, 112, 64, "mansionLeftDoorToBedroom", "E  Entrar no quarto")
      this.createZone(424, 608, 112, 52, "mansionBedroomToHall", "E  Voltar ao corredor")
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
    prompt = "E  Interagir",
  ): void {
    const isSourcePixelZone =
      this.currentMap === "forest1" ||
      this.currentMap === "forest2" ||
      this.currentMap === "forest3" ||
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
      .text(zoneX, zoneY - zoneHeight / 2 - 24, prompt, {
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
    const spokeToReception = this.registry.get("mansionReceptionSpoken") === true

    this.transitionZones.forEach(({ zone, label, target }) => {
      const bounds = zone.getBounds()
      const available = target !== "mansionReceptionDesk" || !spokeToReception
      const isInside = available && bounds.contains(
        this.player.sprite.x,
        this.player.sprite.y,
      )

      const portalLocked = target === "mansionReceptionToHall" && !spokeToReception
      if (target === "mansionReceptionToHall") {
        label.setText(portalLocked ? "Fale na recepção primeiro" : "E  Ir ao corredor")
      }
      label.setVisible(isInside)

      if (isInside && !portalLocked) {
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

    if (target === "mansionReceptionDesk") {
      this.registry.set("mansionReceptionSpoken", true)
      return
    }

    this.transitioning = true

    switch (target) {
      case "mansionEntranceToMansion":
        this.scene.restart({ map: "mansion", spawn: "mansionReception" })
        return
      case "mansionToOutside":
        this.scene.restart({ map: "mansionEntrance", spawn: "mansionEntranceFromInterior" })
        return
      case "mansionReceptionToHall":
        if (this.registry.get("mansionReceptionSpoken") !== true) {
          this.transitioning = false
          return
        }
        this.scene.restart({ map: "mansion", spawn: "mansionHallFromReception" })
        return
      case "mansionHallToReception":
        this.scene.restart({ map: "mansion", spawn: "mansionReceptionFromHall" })
        return
      case "mansionHallToBedroom":
        this.scene.restart({ map: "mansion", spawn: "mansionBedroom" })
        return
      case "mansionLeftDoorToBedroom":
        this.scene.restart({ map: "mansion", spawn: "mansionBedroomFromLeftDoor" })
        return
      case "mansionBedroomToHall":
        this.scene.restart({
          map: "mansion",
          spawn: this.registry.get("mansionSpawn") === "mansionBedroomFromLeftDoor"
            ? "mansionLeftDoorFromBedroom"
            : "mansionHallFromBedroom",
        })
        return
    }

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

    if (target === "forest3ToMansionEntrance") {
      this.scene.restart({
        map: "mansionEntrance",
        spawn: "mansionEntranceFromForest3",
      })
      return
    }

    if (target === "mansionEntranceToForest3") {
      this.scene.restart({
        map: "forest3",
        spawn: "forest3FromMansionEntrance",
      })
      return
    }

    if (target === "bossToCorridor1") {
      this.scene.restart({
        map: "corridor1",
        spawn: "corridor1Top",
      })
      return
    } else if (target === "corridor1ToBoss") {
      this.scene.restart({
        map: "boss",
        spawn: "bossBottom",
      })
      return
    } else if (target === "corridor1ToCorridor2") {
      this.scene.restart({
        map: "corridor2",
        spawn: "corridor2Top",
      })
      return
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
        spawn: "mansionEntranceFromForest3",
      })
      return
    }

    this.transitioning = false
  }

  private swingSword(hit: Set<Slime>): void {
    // Bounds of the forward sword arc in the 128 px half-slash frames.
    const swordBounds = {
      up: [64, 39, 103, 63],
      down: [27, 65, 68, 98],
      left: [3, 48, 59, 87],
      right: [69, 48, 125, 87],
    }
    const sprite = this.player.sprite
    const [left, top, right, bottom] = swordBounds[this.player.getFacing()]
    const frameLeft = sprite.x - sprite.displayOriginX * sprite.scaleX
    const frameTop = sprite.y - sprite.displayOriginY * sprite.scaleY

    for (const slime of this.slimes) {
      const body = slime.sprite.body
      if (
        slime.sprite.active &&
        body &&
        !hit.has(slime) &&
        body.left < frameLeft + right * sprite.scaleX &&
        body.right > frameLeft + left * sprite.scaleX &&
        body.top < frameTop + bottom * sprite.scaleY &&
        body.bottom > frameTop + top * sprite.scaleY
      ) {
        hit.add(slime)
        slime.takeDamage()
      }
    }
  }

  private shoot(character: "kael" | "lira"): void {
    const direction = this.player.getFacing()
    const offset = 56

    let x = this.player.sprite.x
    let y = this.player.sprite.y

    if (direction === "up") y -= offset
    if (direction === "down") y += offset
    if (direction === "left") x -= offset
    if (direction === "right") x += offset

    if (this.collisionLayer.getTilesWithinWorldXY(x - 8, y - 8, 16, 16, { isColliding: true }).length > 0) {
      return
    }

    const bullet = new Bullet(this, x, y, direction, character)
    this.bullets.push(bullet)

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
    if (this.transitioning) {
      if (this.playerHealth === 0) {
        this.player.update()
      }
      return
    }

    const activeCharacter = this.registry.get(
      "activeCharacter",
    ) as PlayerCharacter

    if (this.player.getCharacter() !== activeCharacter) {
      this.player.setCharacter(activeCharacter)
    }

    this.player.update()
    if (
      this.registry.get("partyJoined") === true &&
      this.partyCharacter !== activeCharacter
    ) {
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

    const attackPressed = Input.Keyboard.JustDown(this.attackKey)
    if (activeCharacter === "rian") {
      if (attackPressed) {
        const hit = new Set<Slime>()
        this.player.startAttack(() => this.swingSword(hit))
      }
    } else if (this.attackKey.isDown) {
      this.player.startAttack(() => this.shoot(activeCharacter))
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
