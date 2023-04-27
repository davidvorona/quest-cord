import Encounter from "./Encounter";
import Creature from "../creatures/Creature";
import Character from "../creatures/Character";
import Narrator from "../Narrator";
import Action from "../actions/Action";

export default abstract class TurnBasedEncounter extends Encounter {
    turnIdx = 0;

    turnOrder: Creature[] = [];

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator, true);
    }

    getCurrentTurn = () => this.turnOrder[this.turnIdx];

    getTurnOrderIdx(creature: Creature) {
        return this.turnOrder.indexOf(creature);
    }

    isActionTurnConsuming(action: Action) {
        return action.isTurnConsuming();
    }

    nextTurn() {
        if (this.turnIdx >= this.turnOrder.length - 1) {
            this.turnIdx = 0;
        } else {
            this.turnIdx++;
        }
    }

    getTurnOrderNames = () => this.turnOrder.map(c => c.getName());

    abstract handleTurn(): Promise<void>;

    async handleNextTurn() {
        this.nextTurn();
        await this.handleTurn();
    }
}
