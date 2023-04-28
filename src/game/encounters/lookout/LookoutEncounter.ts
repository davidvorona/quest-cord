import { CommandInteraction } from "../../../types";
import Character from "../../creatures/Character";
import Encounter from "../Encounter";
import Narrator from "../../Narrator";
import { LookoutCommand } from "../../actions";

export default class LookoutEncounter extends Encounter {
    commands = {
        lookout: new LookoutCommand(async (interaction: CommandInteraction) => {
            await this.narrator.ponderAndReply(interaction, "You take in the view, expanding "
                + "your map in all directions.");
        })
    };

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
        console.info(
            "Lookout encounter started...",
            this.getCharacterNames()
        );
    }
}
