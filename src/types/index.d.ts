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

export interface CreatureData {
    name: string,
    lvl: number,
    hp: number,
    damage: number,
    weapons: string[] 
}

export interface MonsterData extends CreatureData {
    zones: string[]
}

export interface BaseCharacter extends CreatureData {
    armor: {
        head: string,
        chest: string,
        leg: string,
        feet: string,
        finger: string
    }
}
