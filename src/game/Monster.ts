import { BaseMonster } from "../types";
import Creature, { Equipment } from "./Creature";
import Item from "./Item";

export default class Monster extends Creature {
    lvl: number;

    loot: Item[];

    zones: string[];

    constructor(args: BaseMonster, equipment: Equipment, loot: Item[] = []) {
        super(args, equipment);

        this.lvl = args.lvl;
        this.loot = loot;
        this.zones = args.zones;
    }
}
