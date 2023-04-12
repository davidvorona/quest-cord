import Character from "./Character";
import Encounter from "./Encounter";

export default class RestEncounter extends Encounter {
    constructor(characters: Character[]) {
        super(characters);
        console.info(
            "Rest encounter started...",
            this.getCharacterNames()
        );
    }
}
