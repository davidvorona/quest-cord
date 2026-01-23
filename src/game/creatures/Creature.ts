import { BaseCreature, Effects } from "../../types";
import { createRandomId } from "../../util";
import Item from "../things/Item";
import Weapon from "../things/Weapon";
import Spell, { AttackSpell } from "../things/Spell";

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

    getWeaponId() {
        return this.getWeapon()?.id ?? "";
    }

    hasRangedWeapon() {
        return this.getWeapon()?.isRanged() ?? false;
    }

    getSpell(spellId: string) {
        return this.spells.find(s => s.id === spellId);
    }

    getSpells() {
        return this.spells;
    }

    isAttackSpell<S extends Spell>(spell: Spell): spell is AttackSpell<S> {
        return spell.damage !== undefined && spell.damage > 0;
    }

    getMeleeAttackSpells()  {
        return this.spells.filter(this.isAttackSpell).filter(s => !s.isRanged());
    }

    getRangedAttackSpells() {
        return this.spells.filter(this.isAttackSpell).filter(s => s.isRanged());
    }

    applyEffects(effects: Effects) {
        if (effects.hp) {
            this.setHp(this.hp + effects.hp);
        }
    }

    private getWeaponDamage() {
        return this.getWeapon()?.damage ?? 0;
    }

    getDamage(): number {
        return this.damage + this.getWeaponDamage();
    }
}
