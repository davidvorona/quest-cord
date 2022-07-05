import { AnyObject, BaseMonster, BaseItem, CharacterClass, BaseConsumable } from "../types";
import { COMPENDIUM_SECTION, ITEM_TYPE } from "../constants";
import Class from "../game/CharacterClass";
import Monster from "../game/Monster";
import Item from "../game/Item";
import Consumable from "../game/Consumable";

class ItemFactory {
    create(data: BaseItem) {
        switch (data.type) {
        case ITEM_TYPE.CONSUMABLE:
            return new Consumable(data as BaseConsumable);
        default:
            return new Item(data as BaseItem);
        }
    }
}

export default class CompendiumFactory {
    itemFactory: ItemFactory;

    constructor() {
        this.itemFactory = new ItemFactory();
    }

    create(type: string, data: AnyObject) {
        switch (type) {
        case COMPENDIUM_SECTION.MONSTERS:
            return new Monster(data as BaseMonster);
        case COMPENDIUM_SECTION.CLASSES:
            return new Class(data as CharacterClass);
        case COMPENDIUM_SECTION.ITEMS:
            return this.itemFactory.create(data as BaseItem);
        default:
            throw new Error("Trying to create invalid object");
        }
    }
}
