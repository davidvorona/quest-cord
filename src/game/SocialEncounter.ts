import Character from "./Character";
import Encounter from "./Encounter";
import NonPlayerCharacter from "./NonPlayerCharacter";

export default class SocialEncounter extends Encounter {
    npcs: NonPlayerCharacter[] = [];

    constructor(characters: Character[], npcs: NonPlayerCharacter[]) {
        super(characters);
        this.npcs = npcs;
        console.info(
            "Social encounter started...",
            this.getCharacterNames(), "vs", this.getNpcNames()
        );
    }

    getNpcNames = () => this.npcs.map(m => m.getName());
}
