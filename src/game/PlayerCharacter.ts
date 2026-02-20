import { rand, loadNames } from "../util";
import Character from "./creatures/Character";
import { defaultXpService } from "../services/ExperienceCalculator";
import { LevelGain } from "../types";
import Profession from "./things/Profession";

const { firstNames, lastNames } = loadNames();


export default class PlayerCharacter {
    readonly character: Character;

    readonly userId: string;

    readonly firstName: string;

    readonly lastName: string;

    readonly profession: Profession;

    heldSpell?: string;

    xp: number;

    lvl: number;

    lvlGains: LevelGain[];

    constructor(
        userId: string,
        character: Character,
        lvlGains: LevelGain[],
        profession: Profession
    ) {
        this.userId = userId;
        this.character = character;
        this.profession = profession;

        this.firstName = firstNames[rand(firstNames.length)];
        this.lastName = lastNames[rand(lastNames.length)];
        // Set the name of the base character to the PC name
        this.character.setName(this.getName());

        this.xp = 0;
        this.lvl = 1;

        this.lvlGains = lvlGains;

        console.info("Character", this.getName(),  "created");
    }

    getCharId() {
        return this.character.id;
    }

    getName() {
        return `${this.firstName} ${this.lastName}`;
    }

    getCharacter() {
        return this.character;
    }

    holdSpell(spellId: string) {
        this.heldSpell = spellId;
    }

    releaseSpell() {
        this.heldSpell = undefined;
    }

    getHeldSpell() {
        if (this.heldSpell) {
            return this.character.getSpell(this.heldSpell);
        }
    }

    gainXp(xp: number) {
        const { lvl: newLvl, xp: newXp } = defaultXpService.gainExperience(this.lvl, this.xp, xp);
        // Set the new XP value
        this.xp = newXp;
        // If level has changed, set the new player level
        if (newLvl > this.lvl) {
            this.lvl = newLvl;
            return this.lvl;
        }
    }

    getEquipment() {
        return this.character.equipment;
    }
}
