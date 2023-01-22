import { BaseCreature, Effects } from "../types";
import Item from "./Item";

export interface Equipment {
    weapon?: Item;
    offhand?: Item;
    helm?: Item;
    armor?: Item;
    cape?: Item;
    boots?: Item;
}

export default class Creature {
    readonly id: string;

    name: string;

    maxHp: number;

    hp: number;

    damage: number;

    equipment: Equipment;

    constructor(data: BaseCreature, equipment: Equipment) {
        this.id = data.id;
        this.name = data.name;
        this.hp = this.maxHp = data.hp;
        this.damage = data.damage;
        this.equipment = equipment;
    }

    getName() {
        return this.name;
    }

    setName(name: string) {
        this.name = name;
    }

    setHp(hp: number) {
        let newHp = hp;
        if (hp < 0) {
            newHp = 0;
        }
        if (hp > this.maxHp) {
            newHp = this.maxHp;
        }
        this.hp = newHp;
    }

    getWeapon(): Item | undefined {
        return this.equipment.weapon;
    }

    applyEffects(effects: Effects) {
        if (effects.hp) {
            this.setHp(this.hp + effects.hp);
        }
    }
}
