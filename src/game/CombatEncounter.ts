import TurnBasedEncounter from "./TurnBasedEncounter";
import Character from "./Character";
import Monster from "./Monster";
import { shuffleArray } from "../util";
import Creature from "./Creature";

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

    isOver = () => !this.getTotalCharacterHp() || !this.getTotalMonsterHp();

    isSuccess = () => !this.getTotalMonsterHp();

    calculateDamage(attacker: Creature): number {
        const baseDamage = attacker.damage;
        const weapon = attacker.getWeapon();
        const weaponDamage = weapon ? weapon.damage : 0;
        return baseDamage + weaponDamage;
    }
}
