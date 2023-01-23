import Encounter from "./Encounter";
import Creature from "./Creature";
import Character from "./Character";

export default class TurnBasedEncounter extends Encounter {
    turnIdx = 0;

    turnOrder: Creature[] = [];

    constructor(characters: Character[]) {
        super(characters, true);
    }

    getCurrentTurn = () => this.turnOrder[this.turnIdx];

    nextTurn = () => {
        if (this.turnIdx >= this.turnOrder.length - 1) {
            this.turnIdx = 0;
        } else {
            this.turnIdx++;
        }
    };

    getTurnOrderNames = () => this.turnOrder.map(c => c.getName());
}
