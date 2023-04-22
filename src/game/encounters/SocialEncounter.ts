import Character from "../creatures/Character";
import Encounter from "./Encounter";
import Narrator from "../Narrator";
import NonPlayerCharacter from "../NonPlayerCharacter";
import { IgnoreCommand, TalkCommand } from "../actions";

export default class SocialEncounter extends Encounter {
    npcs: NonPlayerCharacter[] = [];

    static commands = [
        {
            name: "talk",
            description: "Beg, bully, or bandy your way forward"
        },
        {
            name: "ignore",
            description: "Keep to yourself and ignore the friendly figure"
        }
    ];

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
