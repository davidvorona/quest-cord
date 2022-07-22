/* Structure of JSON file with bot token */
export interface AuthJson {
    TOKEN: string;
}

/* Structure of JSON file with bot config */
export interface ConfigJson {
    CLIENT_ID: string;
    GUILD_ID: string;
    DATA_DIR: string;
}

export interface AnyObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: string | number | any;
}

export interface LevelGain {
    hp?: number;
    damage?: number;
    spells?: string[];
}

export interface Equipment {
    main?: string;
    offHand?: string;
    head?: string;
    body?: string;
    feet?: string;
    ring?: string;
}

export interface CharacterClass {
    id: string;
    name: string;
    baseHp: number;
    baseDamage: number;
    startingEquipment: Equipment;
    startingInventory: Record<string, number>;
    startingSpells: string[];
    lvlGains: LevelGain[];
}

export interface PlayerCharacterState {
    firstName: string;
    lastName: string;
    lvl: number;
    maxHp: number;
    hp: number;
    damage: number;
    equipment: Equipment;
    inventory: Record<string, number>;
    spells: string[];
}

export interface BaseItem {
    id: string;
    name: string;
    type: string;
}

export interface QuantifiedItem extends BaseItem {
    quantity: number;
}

export interface Effects {
    hp?: number;
    maxHp?: number;
    damage?: number;
}

export interface BaseConsumable extends BaseItem {
    duration?: number;
    effects: Effects;
}

export interface BaseCreature {
    id: string;
    name: string;
    hp: number;
    damage: number;
    weapons: string[]; 
}

export interface BaseMonster extends BaseCreature {
    zones: string[];
}

export interface BaseNonPlayerCharacter extends BaseCreature {
    armor?: string[];
    spells?: string[];
    items?: string[];
}
