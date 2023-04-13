import { CommandInteraction } from "../types";
import Character from "./Character";
import Encounter from "./Encounter";
import Narrator from "./Narrator";

export default class LookoutEncounter extends Encounter {
    static commands = [
        ...Encounter.commands,
        {
            name: "lookout",
            description: "Take in your surroundings from a vantage point"
        }
    ];

    commands = {
        ...super.commands,
        lookout: {
            execute: async (interaction: CommandInteraction) => {
                await this.narrator.ponderAndReply(interaction, "You take in the view, expanding "
                    + "your map in all directions.");
            }
        }
    };

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
        console.info(
            "Lookout encounter started...",
            this.getCharacterNames()
        );
    }
}
