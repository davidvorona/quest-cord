import { BaseSpell, Effects } from "../../types";

export enum SpellProperty {
    Range = "range"
}

class Spell {
    id: string;

    name: string;

    damage?: number;

    effects?: Effects;

    properties: string[];

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
}

export default Spell;
