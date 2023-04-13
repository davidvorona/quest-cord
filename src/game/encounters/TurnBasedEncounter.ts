import Encounter from "./Encounter";
import Creature from "../creatures/Creature";
import Character from "../creatures/Character";
import Narrator from "../Narrator";

export default class TurnBasedEncounter extends Encounter {
    turnIdx = 0;

    turnOrder: Creature[] = [];

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator, true);
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

    async handleTurn() {
        throw new Error("Abstract method be implemented by subclass!");
    }

    async handleNextTurn() {
        this.nextTurn();
        await this.handleTurn();
    }
}
