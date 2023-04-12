import { BaseNonPlayerCharacter, CharacterClass } from "../types";
import Creature, { Equipment } from "./Creature";
import Consumable from "./Consumable";
import Item from "./Item";
import Spell from "./Spell";
import Inventory from "./Inventory";

export default class Character extends Creature {
    inventory: Inventory;

    constructor(
        args: CharacterClass | BaseNonPlayerCharacter,
        equipment: Equipment,
        spells: Spell[],
        items: Item[] = []
    ) {
        super(args, equipment, spells);

        this.inventory = new Inventory(items);
    }

    useItem(itemId: string) {
        const item = this.inventory.getItem(itemId);
        if (!item) {
            throw new Error("You do not have this item!");
        }
        if (item instanceof Consumable) {
            this.applyEffects(item.effects);
            this.inventory.removeItem(item.id);
        }
    }

    getInventory() {
        return this.inventory;
    }

    addToInventory(items: Item[]) {
        this.inventory.addItems(items);
    }
}
