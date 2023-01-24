import { LevelGain, CharacterClass } from "../types";
import { ITEM_TYPE } from "../constants";
import Creature, { Equipment } from "./Creature";
import Consumable from "./Consumable";
import Item from "./Item";
import Spell from "./Spell";

export default class Character extends Creature {
    readonly lvlGains: LevelGain[];

    inventory: Item[] = [];

    constructor(
        args: CharacterClass,
        equipment: Equipment,
        spells: Spell[],
        inventory: Item[] = []
    ) {
        super(args, equipment, spells);

        this.lvlGains = args.lvlGains;
        this.inventory = inventory;
    }

    useItem(itemId: string) {
        const inventoryItem = this.inventory.find(i => i.id === itemId);
        if (!inventoryItem) throw new Error("You do not have this item!");
        if (inventoryItem.type === ITEM_TYPE.CONSUMABLE) {
            const consumable = inventoryItem as Consumable; 
            this.applyEffects(consumable.effects);
            const removeIndex = this.inventory.indexOf(inventoryItem);
            this.inventory.splice(removeIndex);
        }
    }

    getInventory() {
        return this.inventory.map(item => item.name);
    }
}
