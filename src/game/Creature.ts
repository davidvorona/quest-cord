import { BaseCreature } from "../types";

export default class Creature {
    id: string;

    name: string;

    maxHp: number;

    hp: number;

    damage: number;

    weapons: string[];

    constructor(data: BaseCreature) {
        this.id = data.id;
        this.name = data.name;
        this.hp = this.maxHp = data.hp;
        this.damage = data.damage;
        this.weapons = data.weapons;
    }

    getName() {
        return this.name;
    }

    setHp(hp: number) {
        this.hp = hp > 0 ? hp : 0;
    }
}
