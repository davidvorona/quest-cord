import Character from "../../creatures/Character";
import Encounter from "../Encounter";
import Monster from "../../creatures/Monster";
import Narrator from "../../Narrator";
import { SneakCommand, SurpriseCommand } from "../../actions";

export default class StealthEncounter extends Encounter {
    monsters: Monster[] = [];

    commands = {
        sneak: new SneakCommand(async () => {
            await this.narrator.ponderAndDescribe(
                "The party decides to sneak past the enemies."
            );
        }),
        surprise: new SurpriseCommand(async () => {
            await this.narrator.ponderAndDescribe("The party mounts a surprise attack!");
        })
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
