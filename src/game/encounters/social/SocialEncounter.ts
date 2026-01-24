import Character from "../../creatures/Character";
import Encounter from "../Encounter";
import Narrator from "../../Narrator";
import NonPlayerCharacter from "../../NonPlayerCharacter";
import { IgnoreCommand, TalkCommand } from "../../actions";
import { EncounterType } from "../../../constants";

// Idea for social encounter: they meet a traveler; on success, it gives info about an
// area (a cell in the world grid) nearby, and reveals it on their local map.

export default class SocialEncounter extends Encounter {
    type = EncounterType.Social;
    description = "In a conversation :speaking_head:";

    npcs: NonPlayerCharacter[] = [];

    commands = {
        talk: new TalkCommand(async () => {
            const npcName = this.getNpcNames()[0];
            await this.narrator.ponderAndDescribe("You walk up to the figure, and "
                + `strike up a conversation. Their name is ${npcName}. After some pleasant `
                + "talk, you bid farewell and continue on your way.");
        }),
        ignore: new IgnoreCommand(async () => {
            await this.narrator.ponderAndDescribe("You keep your head down and "
                + "continue past the figure without saying a word.");
        })
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
