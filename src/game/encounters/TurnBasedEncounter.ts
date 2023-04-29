import Encounter from "./Encounter";
import Character from "../creatures/Character";
import Narrator from "../Narrator";
import Action from "../actions/Action";
import TurnOrder from "./TurnOrder";

export default abstract class TurnBasedEncounter extends Encounter {
    turnOrder: TurnOrder;

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator, true);
        this.turnOrder = new TurnOrder(characters);
    }

    getCurrentTurn = () => this.turnOrder.getCurrentTurn();

    isActionTurnConsuming(action: Action) {
        return action.isTurnConsuming();
    }

    abstract handleTurn(): Promise<void>;

    async handleNextTurn() {
        this.turnOrder.nextTurn();
        await this.handleTurn();
    }
}
