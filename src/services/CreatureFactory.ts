import { COMPENDIUM_SECTION } from "../constants";
import { Equipment } from "../game/Creature";
import Character from "../game/Character";
import Monster from "../game/Monster";
import { CharacterClass, BaseMonster, BaseEquipment } from "../types";
import { rand } from "../util";
import CompendiumReader from "./CompendiumReader";
import ItemFactory from "./ItemFactory";

interface CreatureData {
    monsters: {
        [monsterId: string]: BaseMonster
    },
    classes: {
        [classId: string]: CharacterClass
    }
}

class CreatureFactory {
    compendium: CompendiumReader;

    itemFactory: ItemFactory;

    data: CreatureData;

    constructor(compendiumReader: CompendiumReader, itemFactory: ItemFactory) {
        this.compendium = compendiumReader;
        this.itemFactory = itemFactory;
        const classes = this.compendium.read(COMPENDIUM_SECTION.CLASSES);
        const monsters = this.compendium.read(COMPENDIUM_SECTION.MONSTERS);
        this.data = { classes, monsters };
    }

    createCharacter(classId: string) {
        const data = this.data.classes[classId];
        if (!data) {
            throw new Error(`Invalid class ID: ${classId}`);
        }
        const equipment = this.hydrateEquipment(data.equipment);
        const inventory = this.itemFactory.hydrateList(data.items);
        const character = new Character(data, equipment, inventory);
        return character;
    }

    createMonster(monsterId: string) {
        const data = this.data.monsters[monsterId];
        if (!data) {
            throw new Error(`Invalid monster ID: ${monsterId}`);
        }
        const equipment = this.hydrateEquipment(data.equipment);
        const loot = this.itemFactory.hydrateList(data.loot);
        const monster = new Monster(data, equipment, loot);
        return monster;
    }

    private hydrateEquipment(equipment: BaseEquipment) {
        const hydrated: Equipment = {};
        let slot: keyof BaseEquipment;
        for (slot in equipment) {
            const itemId = equipment[slot];
            hydrated[slot] = itemId ? this.itemFactory.create(itemId) : undefined;
        }
        return hydrated;
    }

    createRandomMonster(): Monster {
        const key = Object.keys(this.data.monsters)[rand(Object.keys(this.data.monsters).length)];
        return this.createMonster(key);
    }

    createRandomMonsterList(length: number) {
        const list: Monster[] = [];
        for (let i = 0; i < length; i++) {
            list.push(this.createRandomMonster());
        }
        return list;
    }
}

export default CreatureFactory;
