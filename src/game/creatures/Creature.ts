import { BaseCreature, Effects } from "../../types";
import { createRandomId } from "../../util";
import Item from "../things/Item";
import Weapon from "../things/Weapon";
import Spell from "../things/Spell";

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

    spells: Spell[];

    constructor(data: BaseCreature, equipment: Equipment, spells: Spell[]) {
        this.baseId = data.id;
        this.id = createRandomId();
        this.name = data.name;
        this.hp = this.maxHp = data.hp;
        this.damage = data.damage;
        this.equipment = equipment;
        this.spells = spells;
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

    getSpell(spellId: string) {
        return this.spells.find(s => s.id === spellId);
    }

    getSpells() {
        return this.spells;
    }

    applyEffects(effects: Effects) {
        if (effects.hp) {
            this.setHp(this.hp + effects.hp);
        }
    }
}
