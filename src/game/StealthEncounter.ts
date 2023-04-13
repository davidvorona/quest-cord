import { CommandInteraction } from "../types";
import Character from "./Character";
import Encounter from "./Encounter";
import Monster from "./Monster";
import Narrator from "./Narrator";

export default class StealthEncounter extends Encounter {
    monsters: Monster[] = [];

    static commands = [
        ...Encounter.commands,
        {
            name: "sneak",
            description: "Try to sneak past the enemies"
        },
        {
            name: "surprise",
            description: "Surprise the enemies and attack!"
        }
    ];

    commands = {
        ...super.commands,
        sneak: {
            execute: async (interaction: CommandInteraction) => {
                await this.narrator.ponderAndReply(interaction, "You sneak past the enemies.");
            }
        },
        surprise: {
            execute: async (interaction: CommandInteraction) => {
                await this.narrator.ponderAndReply(interaction, "You're about to mount a surprise "
                + "attack when you reconsider, and decide to sneak past instead.");
            }
        }
    };

    constructor(characters: Character[], narrator: Narrator, monsters: Monster[]) {
        super(characters, narrator);
        this.monsters = monsters;
        console.info(
            "Stealth encounter started...",
            this.getCharacterNames(), "vs", this.getMonsterNames()
        );
    }

    getMonsterNames = () => this.monsters.map(m => m.getName());
}
