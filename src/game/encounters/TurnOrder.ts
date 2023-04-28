import { shuffleArray } from "../../util";
import Character from "../creatures/Character";
import Creature from "../creatures/Creature";

/**
 * A TurnOrder instance takes a list of creatures, orders their IDs,
 * and handles cycling through the turn order.
 */
export default class TurnOrder {
    turns: string[];

    turnIdx = 0;

    // The optional moreCreatures argument instead of a single generic
    // Creatures[] argument simplifies its instantiation in Encounters.
    constructor(characters: Character[], moreCreatures?: Creature[]) {
        const turnIds = characters.map(c => c.id);
        if (moreCreatures) {
            turnIds.push(...moreCreatures.map(c => c.id));
        }
        // TODO: Add support for different 'ordering' methods
        this.turns = shuffleArray(turnIds);
    }

    getTurns = () => this.turns;

    getLength = () => this.turns.length;

    getTurn = (idx: number) => this.turns[idx];

    getIdx = (id: string) => this.turns.indexOf(id);

    getCurrentTurn = () => this.getTurn(this.turnIdx);

    nextTurn() {
        if (this.turnIdx >= this.turns.length - 1) {
            this.turnIdx = 0;
        } else {
            this.turnIdx++;
        }
    }
}
