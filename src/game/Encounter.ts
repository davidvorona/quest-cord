import Character from "./Character";
import Monster from "./Monster";
import Creature from "./Creature";
import { shuffleArray } from "../util";

export default class Encounter {
    characters: Character[];

    monsters: Monster[] = [];

    turnIdx = 0;

    turnOrder: Creature[] = [];

    constructor(characters: Character[], monsters: Monster[]) {
        this.characters = characters;
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

    getCurrentTurn = () => this.turnOrder[this.turnIdx];

    nextTurn = () => {
        if (this.turnIdx >= this.turnOrder.length - 1) {
            this.turnIdx = 0;
        } else {
            this.turnIdx++;
        }
    };

    getTurnOrderNames = () => this.turnOrder.map(c => c.getName());

    getCharacters = () => this.characters;

    getMonsterNames = () => this.monsters.map(m => m.getName());

    getCharacterNames = () => this.characters.map(char => char.getName());

    getTotalCharacterHp = () => this.characters.reduce((acc, curr) => acc + curr.hp, 0);

    getTotalMonsterHp = () => this.monsters.reduce((acc, curr) => acc + curr.hp, 0);

    isOver = () => {
        return !this.getTotalCharacterHp() || !this.getTotalMonsterHp();
    };
}
