import Character from "../../creatures/Character";
import Encounter from "../Encounter";
import Monster from "../../creatures/Monster";
import Narrator from "../../Narrator";
import { SneakButton, SneakCommand, SurpriseButton, SurpriseCommand } from "../../actions";
import { EncounterType } from "../../../constants";

export default class StealthEncounter extends Encounter {
    type = EncounterType.Stealth;
    description = "Trying to avoid detection... :shushing_face:";

    monsters: Monster[] = [];

    handlePlayerSneak = async () => {
        await this.narrator.ponderAndDescribe(
            "The party decides to sneak past the enemies."
        );
    };

    handlePlayerSurprise = async () => {
        await this.narrator.ponderAndDescribe("The party mounts a surprise attack!");
    };

    commands = {
        sneak: new SneakCommand(this.handlePlayerSneak),
        surprise: new SurpriseCommand(this.handlePlayerSurprise)
    };

    buttons = {
        sneak: new SneakButton(this.handlePlayerSneak),
        surprise: new SurpriseButton(this.handlePlayerSurprise)
    };

    constructor(characters: Character[], narrator: Narrator, monsters: Monster[]) {
        super(characters, narrator);
        this.monsters = monsters;
        console.info(
            "Stealth encounter started...",
            this.getCharacterNames(), "vs", this.getMonsterNames()
        );
    }

    getMonsterNames = () => this.monsters.map(m => m.getName());
}
