import { CompendiumSection, ItemType } from "../constants";
import Item from "../game/things/Item";
import Consumable from "../game/things/Consumable";
import { BaseItem, BaseConsumable, BaseWeapon, BaseArmor, BaseOffhand } from "../types";
import CompendiumReader from "./CompendiumReader";
import Weapon from "../game/things/Weapon";
import Offhand from "../game/things/Offhand";
import Armor from "../game/things/Armor";
import { randKey } from "../util";

class ItemFactory {
    compendium: CompendiumReader;

    data: Record<string, BaseItem>;

    constructor(compendiumReader: CompendiumReader) {
        this.compendium = compendiumReader;
        this.data = this.compendium.read(CompendiumSection.Items);
    }

    create(itemId: string) {
        const data = this.data[itemId];
        if (!data) {
            throw new Error(`Invalid item ID: ${itemId}`);
        }
        switch (data.type) {
        case ItemType.Consumable:
            return new Consumable(data as BaseConsumable);
        case ItemType.Weapon:
            return new Weapon(data as BaseWeapon);
        case ItemType.Offhand:
            return new Offhand(data as BaseOffhand);
        case ItemType.Armor:
            return new Armor(data as BaseArmor);
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
