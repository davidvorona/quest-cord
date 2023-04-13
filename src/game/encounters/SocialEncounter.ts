import { CommandInteraction } from "../../types";
import Character from "../creatures/Character";
import Encounter from "./Encounter";
import Narrator from "../Narrator";
import NonPlayerCharacter from "../NonPlayerCharacter";

export default class SocialEncounter extends Encounter {
    npcs: NonPlayerCharacter[] = [];

    static commands = [
        {
            name: "talk",
            description: "Beg, bully, or bandy your way forward"
        }
    ];

    commands = {
        talk: {
            execute: async (interaction: CommandInteraction) => {
                const npcName = this.getNpcNames()[0];
                await this.narrator.ponderAndReply(interaction, "You walk up to the figure, and "
                    + `strike up a conversation. Their name is ${npcName}. After some pleasant `
                    + "talk, you bid farewell and continue on your way.");
            }
        }
    };

    constructor(characters: Character[], narrator: Narrator, npcs: NonPlayerCharacter[]) {
        super(characters, narrator);
        this.npcs = npcs;
        console.info(
            "Social encounter started...",
            this.getCharacterNames(), "vs", this.getNpcNames()
        );
    }

    getNpcNames = () => this.npcs.map(m => m.getName());
}
