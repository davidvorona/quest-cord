import Encounter from "./Encounter";
import Character from "../creatures/Character";
import Narrator from "../Narrator";

export default class FreeEncounter extends Encounter {
    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
    }

    /**
     * Free encounters are never "over", they are ongoing until players
     * explicitly choose to move on.
     */
    isOver = () => false;
}
