export enum TextActivity {
    Encounter = "encounter",
    Attack = "attack"
}

export enum CompendiumSection {
    Monsters = "monsters",
    Classes = "classes",
    Items = "items",
    Spells = "spells",
    NPCs = "npcs",
    Professions = "professions"
}

export enum ItemType {
    Consumable = "consumable",
    Weapon = "weapon",
    Armor = "armor",
    Offhand = "offhand",
}

export enum Biome {
    Forest = "forest",
    Beach = "beach",
    Ocean = "ocean",
    Desert = "desert",
    Jungle = "jungle",
    Mountains = "mountains"
}

export enum Direction {
    North = "North",
    South = "South",
    East = "East",
    West = "West"
}

export enum DirectionEmoji {
    North = "⬆️",
    South = "⬇️",
    East = "➡️",
    West = "⬅️"
}

export const WORLD_DIMENSION = 40 as const;

export const REGION_DIMENSION = 4 as const;

export enum EncounterType {
    Combat = "Combat",      // Typical combat encounter
    Stealth = "Stealth",    // WIP: Choose between avoiding or surprising monsters
    Social = "Social",      // WIP: An encounter that involves a social interaction
    Merchant = "Merchant",  // WIP: An encounter with a traveling merchant with goods for sale
    Lookout = "Lookout",    // WIP: Get to a vantage point for greater map visibility
    Rest = "Rest"           // A day where nothing happens, characters can rest
}
