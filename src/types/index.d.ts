import {
    ButtonInteraction,
    ChatInputCommandInteraction,
    Guild,
    Interaction,
    StringSelectMenuInteraction,
    TextChannel
} from "discord.js";

/* Structure of JSON file with bot token */
export interface AuthJson {
    TOKEN: string;
}

/* Structure of JSON file with bot config */
export interface ConfigJson {
    CLIENT_ID: string;
    GUILD_ID?: string;
    DATA_DIR?: string;
    FORCE_ENCOUNTER_TYPE?: string;
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

export interface BaseItem {
    id: string;
    name: string;
    type: string;
    value: number;
    description?: string;
}

export interface BaseWeapon extends BaseItem {
    damage: number;
    properties?: string[];
}

export interface Effects {
    hp?: number;
    maxHp?: number;
    damage?: number;
    status?: string;
}

export interface BaseSpell {
    id: string;
    name: string;
    damage?: number;
    properties?: string[];
    effects?: Effects
}

export interface BaseConsumable extends BaseItem {
    duration?: number;
    effects: Effects;
}

export interface BaseEquipment {
    weapon?: string;
    offhand?: string;
    armor?: string;
    helm?: string;
    cape?: string;
    boots?: string;
}

export interface BaseCreature {
    id: string;
    name: string;
    hp: number;
    damage: number;
    equipment: BaseEquipment;
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

export interface BaseProfession {
    id: string;
    name: string;
    description: string;
}

export interface CharacterClass extends BaseCreature {
    items?: string[];
    lvlGains: LevelGain[];
}

export type Direction = "north" | "south" | "east" | "west";

export type QuestLordInteraction<T extends Interaction> = T & {
    guildId: string;
    guild: Guild;
    channel: TextChannel;
};

export type CommandInteraction = QuestLordInteraction<ChatInputCommandInteraction>;
export type SelectMenuInteraction = QuestLordInteraction<StringSelectMenuInteraction>;
export type ButtonPressInteraction = QuestLordInteraction<ButtonInteraction>;
