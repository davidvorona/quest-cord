import { COMPENDIUM_SECTION } from "../constants";
import { Equipment } from "../game/creatures/Creature";
import Character from "../game/creatures/Character";
import NonPlayerCharacter from "../game/NonPlayerCharacter";
import Monster from "../game/creatures/Monster";
import {
    CharacterClass,
    MonsterData,
    BaseEquipment,
    BaseNonPlayerCharacter,
    BaseProfession
} from "../types";
import { randKey } from "../util";
import CompendiumReader from "./CompendiumReader";
import ItemFactory from "./ItemFactory";
import CombatBalancingService from "./CombatBalancingService";
import Weapon from "../game/things/Weapon";
import Item from "../game/things/Item";
import SpellFactory from "./SpellFactory";
import Profession from "../game/things/Profession";

interface CharacterClassData {
    [classId: string]: CharacterClass;
}

interface NonPlayerCharacterData {
    [npcId: string]: BaseNonPlayerCharacter;
}

interface ProfessionData {
    [professionId: string]: BaseProfession;
}

interface CreatureData {
    monsters: MonsterData;
    npcs: NonPlayerCharacterData;
    classes: CharacterClassData;
    professions: ProfessionData;
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
        const professions = this.compendium.read(COMPENDIUM_SECTION.PROFESSIONS);
        this.data = { classes, monsters, npcs, professions };
    }

    createCharacter(data: CharacterClass | BaseNonPlayerCharacter) {
        const equipment = this.hydrateEquipment(data.equipment);
        const inventory = this.itemFactory.hydrateList(data.items);
        const spells = this.spellFactory.hydrateList(data.spells);
        const character = new Character(data, equipment, spells, inventory);
        return character;
    }

    getCharacterClass(classId: string) {
        const data = this.data.classes[classId];
        if (!data) {
            throw new Error(`Invalid class ID: ${classId}`);
        }
        return data;
    }

    createProfession(professionId: string) {
        const data = this.data.professions[professionId];
        if (!data) {
            throw new Error(`Invalid profession ID: ${professionId}`);
        }
        return new Profession(data);
    }

    createClassLevelUps(classId: string) {
        const data = this.data.classes[classId];
        if (!data) {
            throw new Error(`Invalid class ID: ${classId}`);
        }
        return data.lvlGains.map((lvlGain) => ({
            hp: lvlGain.hp,
            damage: lvlGain.damage,
            spells: this.spellFactory.hydrateList(lvlGain.spells)
        }));
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

    createBiomeTypeMonsterList(biome: string) {
        const biomeMonsters: MonsterData = {};
        Object.keys(this.data.monsters).forEach((m) => {
            const monsterData = this.data.monsters[m];
            if (monsterData.zones.includes(biome)) {
                biomeMonsters[m] = monsterData;
            }
        });
        return biomeMonsters;
    }

    createRandomBiomeTypeMonsterList(length: number, biome: string) {
        const biomeMonsters = this.createBiomeTypeMonsterList(biome);
        return this.pickRandomMonsterList(biomeMonsters, length);
    }

    createLeveledBiomeTypeMonsterList(characters: Character[], biome: string, totalLvl: number) {
        const monsterData = this.createBiomeTypeMonsterList(biome);
        const balancingService = new CombatBalancingService(characters, monsterData, totalLvl);
        const strategy = balancingService.pickStrategy();
        console.info(`Balancing encounter via '${strategy}' strategy`);
        const monsters = balancingService.createMonsterList().map((m) => this.createMonster(m.id));
        return monsters;
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
