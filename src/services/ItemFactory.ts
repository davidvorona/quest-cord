import { COMPENDIUM_SECTION, ITEM_TYPE } from "../constants";
import Item from "../game/Item";
import Consumable from "../game/Consumable";
import { BaseItem, BaseConsumable } from "../types";
import CompendiumReader from "./CompendiumReader";

class ItemFactory {
    compendium: CompendiumReader;

    data: Record<string, BaseItem>;

    constructor(compendiumReader: CompendiumReader) {
        this.compendium = compendiumReader;
        this.data = this.compendium.read(COMPENDIUM_SECTION.ITEMS);
    }

    create(itemId: string): Item {
        const data = this.data[itemId];
        if (!data) {
            throw new Error(`Invalid item ID: ${itemId}`);
        }
        switch (data.type) {
        case ITEM_TYPE.CONSUMABLE:
            return new Consumable(data as BaseConsumable);
        default:
            return new Item(data as BaseItem);
        }
    }

    hydrateList(itemIds: string[] = []): Item[] {
        return itemIds.map(id => this.create(id));
    }
}

export default ItemFactory;
