import { Scene } from "phaser"

export type PartyCharacter = "kael" | "rian" | "lira"

export class PartyMenu extends Scene {
  constructor() {
    super("PartyMenu")
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#101820")

    this.add
      .text(400, 120, "SELECIONE O PERSONAGEM", {
        color: "#ffffff",
        fontFamily: "Arial",
        fontSize: "28px",
      })
      .setOrigin(0.5)

    this.add.text(400, 230, "1 - Kael | Guerreiro", {
      color: "#ffffff",
      fontFamily: "Arial",
      fontSize: "24px",
    }).setOrigin(0.5)

    this.add.text(400, 290, "2 - Rian | Mago", {
      color: "#ffffff",
      fontFamily: "Arial",
      fontSize: "24px",
    }).setOrigin(0.5)

    this.add.text(400, 350, "3 - Lira | Fada", {
      color: "#ffffff",
      fontFamily: "Arial",
      fontSize: "24px",
    }).setOrigin(0.5)

    this.add.text(400, 500, "Pressione M ou ESC para fechar", {
      color: "#aab4c5",
      fontFamily: "Arial",
      fontSize: "18px",
    }).setOrigin(0.5)

    const keyboard = this.input.keyboard

    if (!keyboard) {
      return
    }

    keyboard.once("keydown-ONE", () => {
      this.selectCharacter("kael")
    })

    keyboard.once("keydown-TWO", () => {
      this.selectCharacter("rian")
    })

    keyboard.once("keydown-THREE", () => {
      this.selectCharacter("lira")
    })

    keyboard.once("keydown-M", () => {
      this.closeMenu()
    })

    keyboard.once("keydown-ESC", () => {
      this.closeMenu()
    })
  }

  private selectCharacter(character: PartyCharacter): void {
    this.registry.set("activeCharacter", character)
    this.closeMenu()
  }

  private closeMenu(): void {
    this.scene.stop("PartyMenu")
    this.scene.resume("GameScene")
  }
}