import { COMPENDIUM_SECTION, ITEM_TYPE } from "../constants";
import Item from "../game/Item";
import Consumable from "../game/Consumable";
import { BaseItem, BaseConsumable, BaseWeapon } from "../types";
import CompendiumReader from "./CompendiumReader";
import Weapon from "../game/Weapon";
import { randKey } from "../util";

class ItemFactory {
    compendium: CompendiumReader;

    data: Record<string, BaseItem>;

    constructor(compendiumReader: CompendiumReader) {
        this.compendium = compendiumReader;
        this.data = this.compendium.read(COMPENDIUM_SECTION.ITEMS);
    }

    create(itemId: string) {
        const data = this.data[itemId];
        if (!data) {
            throw new Error(`Invalid item ID: ${itemId}`);
        }
        switch (data.type) {
        case ITEM_TYPE.CONSUMABLE:
            return new Consumable(data as BaseConsumable);
        case ITEM_TYPE.WEAPON:
            return new Weapon(data as BaseWeapon);
        default:
            return new Item(data as BaseItem);
        }
    }

    hydrateList(itemIds: string[] = []) {
        return itemIds.map(id => this.create(id));
    }

    private createRandomItem(): Item {
        const key = randKey(this.data);
        return this.create(key);
    }

    createRandomItemList(length: number) {
        const list: Item[] = [];
        for (let i = 0; i < length; i++) {
            list.push(this.createRandomItem());
        }
        return list;
    }
}

export default ItemFactory;
