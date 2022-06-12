import { LevelGain, CharacterClass as CharacterClassType } from "../types";

export default class CharacterClass {
    id: string;

    name: string;

    baseHp: number;

    baseDamage: number;

    startingWeapons: string[];

    startingArmor: string[];

    startingSpells: string[];

    startingItems: string[];

    lvlGains: LevelGain[];

    constructor(args: CharacterClassType) {
        this.id = args.id;
        this.name = args.name;
        this.baseHp = args.baseHp;
        this.baseDamage = args.baseDamage;
        this.startingWeapons = args.startingWeapons;
        this.startingArmor = args.startingArmor;
        this.startingSpells = args.startingSpells;
        this.startingItems = args.startingItems;
        this.lvlGains = args.lvlGains;
    }
}
