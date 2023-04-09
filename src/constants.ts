export enum CommandType {
    NewQuest,
    Questing,
    Combat,
    Stealth,
    Social,
    Merchant,
    Lookout
}

export const ACTIVITY = {
    ENCOUNTER: "encounter",
    ATTACK: "attack"
} as const;

export const COMPENDIUM_SECTION = {
    MONSTERS: "monsters",
    CLASSES: "classes",
    ITEMS: "items",
    SPELLS: "spells",
    NPCS: "npcs"
} as const;

export const ITEM_TYPE = {
    CONSUMABLE: "consumable",
    WEAPON: "weapon"
} as const;

export const BIOME = {
    FOREST: "forest",
    BEACH: "beach",
    OCEAN: "ocean",
    DESERT: "desert",
    JUNGLE: "jungle",
    MOUNTAINS: "mountains"
} as const;

export const DIRECTION = {
    NORTH: "north",
    SOUTH: "south",
    EAST: "east",
    WEST: "west"
} as const;

export const FORMATTED_DIRECTION = {
    NORTH: "North",
    SOUTH: "South",
    EAST: "East",
    WEST: "West"
} as const;

export const WORLD_DIMENSION = 40 as const;

export const REGION_DIMENSION = 4 as const;
