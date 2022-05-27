import { createRandomId, listToMonster } from "../util";
import PlayerCharacter from "./PlayerCharacter";
import Encounter from "./Encounter";
import compendium from "../compendium";
import { COMPENDIUM_SECTION } from "../constants";
import { MonsterData } from "../types";

export default class Quest {
    id: string;

    guildId: string;

    pcs: Record<string, PlayerCharacter> = {};

    encounter?: Encounter;

    constructor(guildId: string) {
        console.info("Accepting new quest...");
        this.id = createRandomId();
        this.guildId = guildId;
    }

    addPlayer(userId: string) {
        const baseCharacter = compendium.data.classes.Wizard;
        const pc = new PlayerCharacter(baseCharacter, userId);
        this.pcs[userId] = pc;
    }

    getPlayerByUserId(userId: string) {
        return this.pcs[userId];
    }

    assertEncounterStarted() {
        return !!this.encounter;
    }

    startEncounter() {
        const list = compendium.pickRandomList(COMPENDIUM_SECTION.MONSTERS, 4) as MonsterData[];
        const pcs = Object.values(this.pcs);
        const encounter = new Encounter(pcs, listToMonster(list));
        this.encounter = encounter;
    }

    getEncounter() {
        return this.encounter;
    }
}
