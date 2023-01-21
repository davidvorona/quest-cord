export const COMMAND_TYPE = {
    NEW_QUEST: "new_quest",
    ENCOUNTER: "encounter"
} as const;

export const ACTIVITY = {
    ENCOUNTER: "encounter",
    ATTACK: "attack"
} as const;

export const COMPENDIUM_SECTION = {
    MONSTERS: "monsters",
    CLASSES: "classes",
    ITEMS: "items"
} as const;

export const ITEM_TYPE = {
    CONSUMABLE: "consumable"
} as const;

export const BIOME = {
    FOREST: "forest",
    BEACH: "beach",
    OCEAN: "ocean",
    DESERT: "desert",
    JUNGLE: "jungle",
    MOUNTAINS: "mountains"
} as const;

export const WORLD_DIMENSION = 40 as const;

export const REGION_DIMENSION = 4 as const;
