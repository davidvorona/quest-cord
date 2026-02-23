export const ACTIVITY = {
    ENCOUNTER: "encounter",
    ATTACK: "attack"
} as const;

export const COMPENDIUM_SECTION = {
    MONSTERS: "monsters",
    CLASSES: "classes",
    ITEMS: "items",
    SPELLS: "spells",
    NPCS: "npcs",
    PROFESSIONS: "professions"
} as const;

export const ITEM_TYPE = {
    CONSUMABLE: "consumable",
    WEAPON: "weapon",
    ARMOR: "armor",
    OFFHAND: "offhand",
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

export const DIRECTION_EMOJI = {
    NORTH: "⬆️",
    SOUTH: "⬇️",
    EAST: "➡️",
    WEST: "⬅️"
} as const;

export const WORLD_DIMENSION = 40 as const;

export const REGION_DIMENSION = 4 as const;

export enum EncounterType {
    Unspecified = "Unspecified",
    Combat = "Combat",      // Typical combat encounter
    Stealth = "Stealth",    // WIP: Choose between avoiding or surprising monsters
    Social = "Social",      // WIP: An encounter that involves a social interaction
    Merchant = "Merchant",  // WIP: An encounter with a traveling merchant with goods for sale
    Lookout = "Lookout",    // WIP: Get to a vantage point for greater map visibility
    Rest = "Rest"           // WIP: A day where nothing happens, characters can rest and get buff
}
