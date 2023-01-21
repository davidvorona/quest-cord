import { BaseMonster, BaseItem } from "../types";
import Creature from "./Creature";
import compendium from "../compendium";

export default class Monster extends Creature {
    lvl: number;

    loot: BaseItem[];

    zones: string[];

    constructor(args: BaseMonster) {
        super(args);

        this.lvl = args.lvl;

        this.loot = Monster.createLoot(args.loot);
        this.zones = args.zones;
    }

    private static createLoot(items: string[] = []) {
        return compendium.spawnItems(items);
    }
}
