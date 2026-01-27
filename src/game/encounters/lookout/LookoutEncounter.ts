import { ButtonPressInteraction, CommandInteraction } from "../../../types";
import Character from "../../creatures/Character";
import Encounter from "../Encounter";
import Narrator from "../../Narrator";
import { LookoutCommand, LookoutButton } from "../../actions";
import { EncounterType } from "../../../constants";

export default class LookoutEncounter extends Encounter {
    type = EncounterType.Lookout;
    description = "Surveying the area :telescope:";

    handlePlayerLookout = async (interaction: CommandInteraction | ButtonPressInteraction) => {
        await this.narrator.ponderAndReply(interaction, "You take in the view, expanding "
            + "your map in all directions.");
    };

    commands = {
        lookout: new LookoutCommand(this.handlePlayerLookout)
    };

    buttons = {
        lookout: new LookoutButton(this.handlePlayerLookout)
    };

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
        console.info(
            "Lookout encounter started...",
            this.getCharacterNames()
        );
    }
}
