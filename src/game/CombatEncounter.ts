import TurnBasedEncounter from "./TurnBasedEncounter";
import Character from "./Character";
import Monster from "./Monster";
import { shuffleArray } from "../util";

export default class CombatEncounter extends TurnBasedEncounter {
    monsters: Monster[] = [];

    constructor(characters: Character[], monsters: Monster[]) {
        super(characters);
        this.monsters = monsters;
        this.turnOrder = shuffleArray([...characters, ...monsters]);
        console.info(
            "Encounter started...",
            this.getCharacterNames(), "vs", this.getMonsterNames()
        );
    }

    getMonsterByIndex(index: number): Monster {
        return this.monsters[index];
    }

    getMonsterNames = () => this.monsters.map(m => m.getName());

    getTotalCharacterHp = () => this.characters.reduce((acc, curr) => acc + curr.hp, 0);

    getTotalMonsterHp = () => this.monsters.reduce((acc, curr) => acc + curr.hp, 0);

    isOver = () => {
        return !this.getTotalCharacterHp() || !this.getTotalMonsterHp();
    };
}
