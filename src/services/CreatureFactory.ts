import { COMPENDIUM_SECTION } from "../constants";
import { Equipment } from "../game/creatures/Creature";
import Character from "../game/creatures/Character";
import NonPlayerCharacter from "../game/NonPlayerCharacter";
import Monster from "../game/creatures/Monster";
import {
    CharacterClass,
    BaseMonster,
    BaseEquipment,
    BaseNonPlayerCharacter
} from "../types";
import { randKey } from "../util";
import CompendiumReader from "./CompendiumReader";
import ItemFactory from "./ItemFactory";
import Weapon from "../game/things/Weapon";
import Item from "../game/things/Item";
import SpellFactory from "./SpellFactory";

interface CharacterClassData {
    [classId: string]: CharacterClass;
}

interface MonsterData {
    [monsterId: string]: BaseMonster;
}

interface NonPlayerCharacterData {
    [npcId: string]: BaseNonPlayerCharacter;
}

interface CreatureData {
    monsters: MonsterData;
    npcs: NonPlayerCharacterData;
    classes: CharacterClassData;
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
        const npcs = this.compendium.read(COMPENDIUM_SECTION.NPCS);
        this.data = { classes, monsters, npcs };
    }

    createCharacter(data: CharacterClass | BaseNonPlayerCharacter) {
        const equipment = this.hydrateEquipment(data.equipment);
        const inventory = this.itemFactory.hydrateList(data.items);
        const spells = this.spellFactory.hydrateList(data.spells);
        const character = new Character(data, equipment, spells, inventory);
        return character;
    }

    createClassCharacter(classId: string) {
        const data = this.data.classes[classId];
        if (!data) {
            throw new Error(`Invalid class ID: ${classId}`);
        }
        return this.createCharacter(data);
    }

    createNonPlayerCharacter(npcId: string) {
        const data = this.data.npcs[npcId];
        if (!data) {
            throw new Error(`Invalid NPC ID: ${npcId}`);
        }
        const character = this.createCharacter(data);
        return new NonPlayerCharacter(character);
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

    /** Monsters */

    private createRandomMonster(): Monster {
        const key = randKey(this.data.monsters);
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
        const key = randKey(monsters);
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


    /** Non-player Characters */

    private createRandomNonPlayerCharacter(): NonPlayerCharacter {
        const key = randKey(this.data.npcs);
        return this.createNonPlayerCharacter(key);
    }

    createRandomNpcList(length: number) {
        const list: NonPlayerCharacter[] = [];
        for (let i = 0; i < length; i++) {
            list.push(this.createRandomNonPlayerCharacter());
        }
        return list;
    }

    createRandomMerchant(): NonPlayerCharacter {
        const key = randKey(this.data.npcs);
        const merchant = this.createNonPlayerCharacter(key);
        const stock = this.itemFactory.createRandomItemList(10);
        merchant.character.addToInventory(stock);
        return merchant;
    }
}

export default CreatureFactory;
