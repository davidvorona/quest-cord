import { BaseCreature, Effects } from "../types";

export default class Creature {
    id: string;

    name: string;

    maxHp: number;

    hp: number;

    damage: number;

    weapons: string[];

    armor: string[];

    spells: string[];

    constructor(data: BaseCreature) {
        this.id = data.id;
        this.name = data.name;
        this.hp = this.maxHp = data.hp;
        this.damage = data.damage;
        this.weapons = data.weapons || [];
        this.armor = data.armor || [];
        this.spells = data.spells || [];
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
        // const weapon = this.weapons.find(w => !w.properties.includes("offhand"));
    }

    attackWeapon() {
        this.getWeapon();
    }

    applyEffects(effects: Effects) {
        if (effects.hp) {
            this.setHp(this.hp + effects.hp);
        }
    }
}
