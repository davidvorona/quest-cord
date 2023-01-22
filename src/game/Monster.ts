import { BaseMonster } from "../types";
import Creature, { Equipment } from "./Creature";
import Item from "./Item";

export default class Monster extends Creature {
    readonly lvl: number;

    readonly loot: Item[];

    readonly zones: string[];

    constructor(args: BaseMonster, equipment: Equipment, loot: Item[] = []) {
        super(args, equipment);

        this.lvl = args.lvl;
        this.loot = loot;
        this.zones = args.zones;
    }
}
