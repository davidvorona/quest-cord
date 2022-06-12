import { AnyObject, BaseMonster, BaseItem, CharacterClass } from "../types";
import { COMPENDIUM_SECTION } from "../constants";
import Class from "../game/CharacterClass";
import Monster from "../game/Monster";
import Item from "../game/Item";

export default class CompendiumFactory {
    create(type: string, data: AnyObject) {
        switch (type) {
        case COMPENDIUM_SECTION.MONSTERS:
            return new Monster(data as BaseMonster);
        case COMPENDIUM_SECTION.CLASSES:
            return new Class(data as CharacterClass);
        case COMPENDIUM_SECTION.ITEMS:
            return new Item(data as BaseItem);
        default:
            throw new Error("Trying to create invalid object");
        }
    }
}
