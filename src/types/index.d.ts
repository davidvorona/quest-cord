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

export interface BiomeData {
    depth?: number;
    region: boolean;
    emoji: string;
}

/* Stricture of JSON file with biome data */
export type Biome = "forest" | "beach" | "desert" | "mountains" | "ocean" | "jungle";
export type BiomesJson = Record<Biome, BiomeData>;

export interface AnyObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: string | number | any;
}

export interface PlayerCharacterState {
    firstName: string;
    lastName: string;
    lvl: number;
    maxHp: number;
    hp: number;
    damage: number;
    weapons: string[];
    armor: string[];
    spells: string[];
    items: string[];
}

export interface BaseItem {
    id: string;
    name: string;
    type: string;
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
    weapons?: string[];
    armor?: string[];
    spells?: string[];
}

export interface BaseMonster extends BaseCreature {
    lvl: number;
    loot?: string[];
    zones: string[];
}

export interface BaseNonPlayerCharacter extends BaseCreature {
    items?: string[];
}

export interface LevelGain {
    hp?: number;
    damage?: number;
    spells?: string[];
}

export interface CharacterClass extends BaseCreature {
    items?: string[];
    lvlGains: LevelGain[];
}

export type Direction = "north" | "south" | "east" | "west";
