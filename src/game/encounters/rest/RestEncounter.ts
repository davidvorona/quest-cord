import Character from "../../creatures/Character";
import FreeEncounter from "../FreeEncounter";
import Narrator from "../../Narrator";

export default class RestEncounter extends FreeEncounter {
    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
        console.info(
            "Rest encounter started...",
            this.getCharacterNames()
        );
    }
}
