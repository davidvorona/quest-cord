import { BaseCreature, Effects } from "../types";
import { createRandomId } from "../util";
import Item from "./Item";
import Weapon from "./Weapon";

export interface Equipment {
    weapon?: Weapon;
    offhand?: Item;
    helm?: Item;
    armor?: Item;
    cape?: Item;
    boots?: Item;
}

export default class Creature {
    readonly baseId: string;

    readonly id: string;

    name: string;

    maxHp: number;

    hp: number;

    damage: number;

    equipment: Equipment;

    constructor(data: BaseCreature, equipment: Equipment) {
        this.baseId = data.id;
        this.id = createRandomId();
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

    getWeapon() {
        return this.equipment.weapon;
    }

    applyEffects(effects: Effects) {
        if (effects.hp) {
            this.setHp(this.hp + effects.hp);
        }
    }
}
