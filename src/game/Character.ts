import { LevelGain, CharacterClass, BaseItem } from "../types";
import { ITEM_TYPE } from "../constants";
import Creature from "./Creature";
import Consumable from "./Consumable";
import compendium from "../compendium";

export default class Character extends Creature {
    lvlGains: LevelGain[];

    inventory: BaseItem[];

    constructor(args: CharacterClass) {
        super(args);

        this.inventory = Character.createInventory(args.items);

        this.lvlGains = args.lvlGains;
    }

    private static createInventory(items: string[] = []) {
        return compendium.spawnItems(items);
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
