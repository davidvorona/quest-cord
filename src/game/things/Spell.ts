import { BaseSpell, Effects } from "../../types";

class Spell {
    id: string;

    name: string;

    damage?: number;

    effects?: Effects;

    constructor(args: BaseSpell) {
        this.id = args.id;
        this.name = args.name;
        this.damage = args.damage;
        this.effects = args.effects;
    }
}

export default Spell;
