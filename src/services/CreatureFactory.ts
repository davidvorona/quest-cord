import { COMPENDIUM_SECTION } from "../constants";
import { Equipment } from "../game/Creature";
import Character from "../game/Character";
import Monster from "../game/Monster";
import { CharacterClass, BaseMonster, BaseEquipment } from "../types";
import { rand } from "../util";
import CompendiumReader from "./CompendiumReader";
import ItemFactory from "./ItemFactory";
import Weapon from "../game/Weapon";
import Item from "../game/Item";
import SpellFactory from "./SpellFactory";

interface MonsterData {
    [monsterId: string]: BaseMonster
}

interface CreatureData {
    monsters: MonsterData;
    classes: {
        [classId: string]: CharacterClass
    }
}

class CreatureFactory {
    compendium: CompendiumReader;

    itemFactory: ItemFactory;

    spellFactory: SpellFactory;

    data: CreatureData;

    constructor(
        compendiumReader: CompendiumReader,
        itemFactory: ItemFactory,
        spellFactory: SpellFactory
    ) {
        this.compendium = compendiumReader;
        this.itemFactory = itemFactory;
        this.spellFactory = spellFactory;
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
        const spells = this.spellFactory.hydrateList(data.spells);
        const character = new Character(data, equipment, spells, inventory);
        return character;
    }

    createMonster(monsterId: string) {
        const data = this.data.monsters[monsterId];
        if (!data) {
            throw new Error(`Invalid monster ID: ${monsterId}`);
        }
        const equipment = this.hydrateEquipment(data.equipment);
        const loot = this.itemFactory.hydrateList(data.loot);
        const spells = this.spellFactory.hydrateList(data.spells);
        const monster = new Monster(data, equipment, spells, loot);
        return monster;
    }

    private hydrateEquipment(equipment: BaseEquipment) {
        const hydrated: Equipment = {};
        let slot: keyof BaseEquipment;
        for (slot in equipment) {
            const itemId = equipment[slot];
            hydrated[slot] = itemId
                ? this.itemFactory.create(itemId) as Weapon & Item
                : undefined;
        }
        return hydrated;
    }

    private createRandomMonster(): Monster {
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

    private pickRandomMonster(monsters: MonsterData) {
        const key = Object.keys(monsters)[rand(Object.keys(monsters).length)];
        return this.createMonster(key);
    }

    private pickRandomMonsterList(monsters: MonsterData, length: number) {
        const list: Monster[] = [];
        for (let i = 0; i < length; i++) {
            list.push(this.pickRandomMonster(monsters));
        }
        return list;
    }

    createRandomBiomeTypeMonsterList(length: number, biome: string) {
        const biomeMonsters: MonsterData = {};
        Object.keys(this.data.monsters).forEach((m) => {
            const monsterData = this.data.monsters[m];
            if (monsterData.zones.includes(biome)) {
                biomeMonsters[m] = monsterData;
            }
        });
        return this.pickRandomMonsterList(biomeMonsters, length);
    }
}

export default CreatureFactory;
