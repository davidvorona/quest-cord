import { BaseMonster } from "../types";
import Creature, { Equipment } from "./Creature";
import Item from "./Item";
import Spell from "./Spell";

export default class Monster extends Creature {
    readonly lvl: number;

    readonly loot: Item[];

    readonly zones: string[];

    constructor(args: BaseMonster, equipment: Equipment, spells: Spell[], loot: Item[] = []) {
        super(args, equipment, spells);

        this.lvl = args.lvl;
        this.loot = loot;
        this.zones = args.zones;
    }
}
