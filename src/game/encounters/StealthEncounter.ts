import Character from "../creatures/Character";
import Encounter from "./Encounter";
import Monster from "../creatures/Monster";
import Narrator from "../Narrator";

export default class StealthEncounter extends Encounter {
    monsters: Monster[] = [];

    static commands = [
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
        sneak: {
            execute: async () => {
                await this.narrator.ponderAndDescribe(
                    "The party decides to sneak past the enemies."
                );
            }
        },
        surprise: {
            execute: async () => {
                await this.narrator.ponderAndDescribe("You're about to mount a surprise "
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
