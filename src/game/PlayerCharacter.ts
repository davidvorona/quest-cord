import compendium from "../compendium";
import { ITEM_TYPE } from "../constants";
import { BaseItem, Effects, PlayerCharacterState } from "../types";
import { rand, loadNames } from "../util";
import CharacterClass from "./CharacterClass";
import Consumable from "./Consumable";

const { firstNames, lastNames } = loadNames();

export default class PlayerCharacter {
    characterClass: CharacterClass;

    userId: string;

    firstName: string;

    lastName: string;

    lvl: number;

    maxHp: number;

    hp: number;

    damage: number;

    weapons: string[];

    armor: string[];

    spells: string[];

    inventory: BaseItem[];

    constructor(userId: string, characterClass: CharacterClass, savedState?: PlayerCharacterState) {
        this.characterClass = characterClass;
        this.userId = userId;

        const state = savedState || {} as PlayerCharacterState;
        this.firstName = state.firstName || firstNames[rand(firstNames.length)];
        this.lastName = state.lastName || lastNames[rand(lastNames.length)];
        // PC lvl must be set first, since some data depends on it
        this.lvl = state.lvl || 1;
        this.maxHp = state.maxHp || this.computeMaxHp();
        this.hp = state.hp || this.maxHp;
        this.damage = state.damage || this.characterClass.baseDamage;
        this.weapons = state.weapons || this.characterClass.startingWeapons;
        this.armor = state.armor || this.characterClass.startingArmor;
        this.spells = state.spells || this.characterClass.startingSpells;

        const items = state.items || this.characterClass.startingItems;
        this.inventory = compendium.spawnItems(items);

        console.info("Character", this.getName(),  "created");
    }

    getName() {
        return `${this.firstName} ${this.lastName}`;
    }

    getLvlsGained() {
        const result = [...this.characterClass.lvlGains];
        result.splice(this.lvl - 1);
        return result;
    }

    computeMaxHp() {
        const lvlsGained = this.getLvlsGained();
        return this.characterClass.baseHp
            + lvlsGained.reduce((acc, curr) => curr.hp || 0, 0);
    }

    setHp(hp: number) {
        if (hp < 0) {
            return 0;
        }
        if (hp > this.maxHp) {
            return this.maxHp;
        }
        return hp;
    }

    useItem(itemId: string) {
        const inventoryItem = this.inventory.find(i => i.id === itemId);
        if (!inventoryItem) throw new Error("You do not have this item!");
        if (inventoryItem.type === ITEM_TYPE.CONSUMABLE) {
            const consumable = inventoryItem as Consumable; 
            this.applyEffects(consumable.effects);
            const removeIndex = this.inventory.indexOf(inventoryItem);
            this.inventory.splice(removeIndex);
        }
    }

    applyEffects(effects: Effects) {
        if (effects.hp) {
            this.setHp(this.hp + effects.hp);
        }
    }

    getInventory() {
        return this.inventory.map(item => item.name);
    }
}
