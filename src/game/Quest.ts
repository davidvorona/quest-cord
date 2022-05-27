import { createRandomId } from "../util";
import PlayerCharacter from "./PlayerCharacter";
import Monster from "./Monster";
import Encounter from "./Encounter";
import compendium from "../compendium";

export default class Quest {
    id: string;

    guildId: string;

    pcs: PlayerCharacter[] = [];

    encounter?: Encounter;

    constructor(guildId: string) {
        console.info("Accepting new quest...");
        this.id = createRandomId();
        this.guildId = guildId;
    }

    addPlayer(userId: string) {
        const baseCharacter = compendium.data.classes.Wizard;
        const pc = new PlayerCharacter(baseCharacter, userId);
        this.pcs.push(pc);
    }

    startEncounter(): void {
        const goblin = new Monster(compendium.data.monsters.Goblin);
        const encounter = new Encounter(this.pcs, [goblin]);
        this.encounter = encounter;
    }

    getEncounter(): Encounter | undefined {
        return this.encounter;
    }
}
