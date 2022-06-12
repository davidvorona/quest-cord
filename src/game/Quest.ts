import { createRandomId, isEmpty, listToMonster } from "../util";
import PlayerCharacter from "./PlayerCharacter";
import Encounter from "./Encounter";
import compendium from "../compendium";
import { COMPENDIUM_SECTION } from "../constants";
import { BaseMonster } from "../types";

export default class Quest {
    id: string;

    guildId: string;

    pcs: Record<string, PlayerCharacter | null> = {};

    encounter?: Encounter;

    constructor(guildId: string) {
        console.info("Accepting new quest...");
        this.id = createRandomId();
        this.guildId = guildId;
    }

    addPlayer(userId: string) {
        this.pcs[userId] = null;
    }

    getPlayerByUserId(userId: string) {
        return this.pcs[userId];
    }

    isUserInParty(userId: string) {
        return Object.prototype.hasOwnProperty.call(this.pcs, userId);
    }

    createCharacter(userId: string, classId?: string) {
        const characterClass = compendium.spawnCharacterClass(classId);
        const pc = new PlayerCharacter(userId, characterClass);
        this.pcs[userId] = pc;
        return pc;
    }

    isCharacterCreated(userId: string) {
        return !isEmpty(this.pcs[userId]);
    }

    areAllCharactersCreated() {
        return Object.values(this.pcs).every(pc => !isEmpty(pc));
    }

    assertEncounterStarted() {
        if (isEmpty(this.encounter)) {
            throw new Error("Encounter is not started, aborting");
        }
    }

    startEncounter() {
        const list = compendium.pickRandomList(COMPENDIUM_SECTION.MONSTERS, 4) as BaseMonster[];
        const pcs = Object.values(this.pcs) as PlayerCharacter[];
        const encounter = new Encounter(pcs, listToMonster(list));
        this.encounter = encounter;
    }

    getEncounter() {
        return this.encounter;
    }
}
