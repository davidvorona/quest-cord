import Item from "../game/things/Item";
import { rand, randInList } from "../util";

const gpE: Record<number, number> = {
    1: 7,
    2: 10,
    3: 12,
    4: 13,
    5: 14,
    6: 22,
    7: 28,
    8: 33,
    9: 36,
    10: 42,
    11: 62,
    12: 79,
    13: 100,
    14: 113,
    15: 133,
    16: 233,
    17: 313,
    18: 406,
    19: 500,
    20: 500,
} as const;

export interface Loot {
    gp: number;
    items: Item[];
}

class LootBox {
    lootTable: Item[];

    loot?: Loot;

    constructor(lootTable: Item[]) {
        this.lootTable = lootTable;
    }

    roll(lvl: number) {
        if (this.isLooted()) {
            throw new Error("Loot box already looted!");
        }
        const loot: Loot = {
            gp: 0,
            items: []
        };
        const goldPerEncounter = gpE[lvl];
        loot.items.push(randInList(this.lootTable));
        const roll1Val = loot.items[0].value;
        console.info("Rolled for loot, value", roll1Val, "gold");
        // Roll a second item if value of loot is less than half of expected for encounter
        if (roll1Val < (goldPerEncounter / 2)) {
            loot.items.push(randInList(this.lootTable));
            console.info("Rolled for second loot, value", loot.items[1].value, "gold");
        }
        // Roll for a random amount of gold if total loot value is still less than expected
        const totalLootValue = loot.items.reduce((acc, item) => acc + item.value, 0);
        if (totalLootValue < goldPerEncounter) {
            loot.gp = rand(goldPerEncounter - totalLootValue);
            console.info("Rolled for gold, total", loot.gp, "gp");
        }
        this.loot = loot;
        return this.loot;
    }

    isLooted() {
        return this.loot !== undefined;
    }
}

export default LootBox;
