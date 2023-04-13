import Character from "./Character";
import Encounter from "./Encounter";
import Narrator from "./Narrator";

export default class RestEncounter extends Encounter {
    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
        console.info(
            "Rest encounter started...",
            this.getCharacterNames()
        );
    }
}
