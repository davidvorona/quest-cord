import Character from "./Character";
import Encounter from "./Encounter";

export default class LookoutEncounter extends Encounter {

    constructor(characters: Character[]) {
        super(characters);
        console.info(
            "Lookout encounter started...",
            this.getCharacterNames()
        );
    }
}
