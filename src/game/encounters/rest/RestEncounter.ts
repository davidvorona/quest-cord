import Character from "../../creatures/Character";
import FreeEncounter from "../FreeEncounter";
import Narrator from "../../Narrator";
import { EncounterType } from "../../../constants";

export default class RestEncounter extends FreeEncounter {
    type = EncounterType.Rest;
    description = "Taking a rest... :zzz:";

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
        console.info(
            "Rest encounter started...",
            this.getCharacterNames()
        );
    }
}
