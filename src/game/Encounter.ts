import PlayerCharacter from "./PlayerCharacter";
import Monster from "./Monster";
import Creature from "./Creature";
import { shuffleArray } from "../util";

export default class Encounter {
    pcs: PlayerCharacter[];

    npcs = [];

    monsters: Monster[] = [];

    turnIdx = 0;

    turnOrder: Creature[] = [];

    constructor(pcs: PlayerCharacter[], monsters: Monster[]) {
        this.pcs = pcs;
        this.monsters = monsters;
        this.turnOrder = shuffleArray([...pcs, ...monsters]);
        console.info(
            "Encounter started...",
            this.getPcNames(), "vs", this.getMonsterNames()
        );
    }

    getMonsterByIndex(index: number): Monster {
        return this.monsters[index];
    }

    getCurrentTurn = () => this.turnOrder[this.turnIdx];

    nextTurn = () => {
        if (this.turnIdx >= this.turnOrder.length - 1) {
            this.turnIdx = 0;
        } else {
            this.turnIdx++;
        }
    };

    getTurnOrderNames = () => this.turnOrder.map((c) => {
        if (c instanceof PlayerCharacter) return c.getName();
        return c.state.name;
    });

    getMonsterNames = () => this.monsters.map(m => m.state.name);

    getPcNames = () => this.pcs.map(pc => pc.getName());
}
