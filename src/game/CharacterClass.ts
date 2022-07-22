import { LevelGain, CharacterClass as CharacterClassType, Equipment } from "../types";

export default class CharacterClass {
    id: string;

    name: string;

    baseHp: number;

    baseDamage: number;

    startingEquipment: Equipment;

    startingSpells: string[];

    startingInventory: Record<string, number>;

    lvlGains: LevelGain[];

    constructor(args: CharacterClassType) {
        this.id = args.id;
        this.name = args.name;
        this.baseHp = args.baseHp;
        this.baseDamage = args.baseDamage;
        this.startingEquipment = args.startingEquipment;
        this.startingInventory = args.startingInventory;
        this.startingSpells = args.startingSpells;
        this.lvlGains = args.lvlGains;
    }
}
