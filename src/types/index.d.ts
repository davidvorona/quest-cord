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

export enum ArmorSlot {
    Helm = "helm",
    Body = "body",
    Boots = "boots",
    Cape = "cape"
}

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

export interface BaseArmor extends BaseItem {
    slot: ArmorSlot;
    ac: number;
    properties?: string[];
}

export interface BaseOffhand extends BaseItem {
    damage: number;
    ac: number;
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
    body?: string;
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

export type QuestLordInteraction<T extends Interaction> = T & {
    guildId: string;
    guild: Guild;
    channel: TextChannel;
};

export type CommandInteraction = QuestLordInteraction<ChatInputCommandInteraction>;
export type SelectMenuInteraction = QuestLordInteraction<StringSelectMenuInteraction>;
export type ButtonPressInteraction = QuestLordInteraction<ButtonInteraction>;

interface MonsterData {
    [monsterId: string]: BaseMonster;
}
