import { BaseSpell, Effects } from "../../types";
import { SpellProperty } from "../../constants";

class Spell {
    id: string;

    name: string;

    damage?: number;

    effects?: Effects;

    properties: SpellProperty[];

    constructor(args: BaseSpell) {
        this.id = args.id;
        this.name = args.name;
        this.damage = args.damage;
        this.effects = args.effects;
        this.properties = args.properties || [];
    }

    isRanged() {
        return this.properties.indexOf(SpellProperty.Range) > -1;
    }

    isAoe() {
        return this.properties.indexOf(SpellProperty.AOE) > -1;
    }
}

export default Spell;

export type AttackSpell<S extends Spell> = S & {
    damage: number;
};

export type HealingSpell<S extends Spell> = S & {
    effects: Effects & { hp: number };
};
