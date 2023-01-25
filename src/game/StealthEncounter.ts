import Character from "./Character";
import Encounter from "./Encounter";
import Monster from "./Monster";

export default class StealthEncounter extends Encounter {
    monsters: Monster[] = [];

    constructor(characters: Character[], monsters: Monster[]) {
        super(characters);
        this.monsters = monsters;
        console.info(
            "Stealth encounter started...",
            this.getCharacterNames(), "vs", this.getMonsterNames()
        );
    }

    getMonsterNames = () => this.monsters.map(m => m.getName());
}
