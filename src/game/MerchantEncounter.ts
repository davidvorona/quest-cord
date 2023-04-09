import Character from "./Character";
import Encounter from "./Encounter";
import NonPlayerCharacter from "./NonPlayerCharacter";

export default class MerchantEncounter extends Encounter {
    merchant: NonPlayerCharacter;

    constructor(characters: Character[], merchant: NonPlayerCharacter) {
        super(characters);
        this.merchant = merchant;
        console.info(
            "Merchant encounter started...",
            this.getCharacterNames(), "vs", this.getMerchantName()
        );
    }

    getMerchantName = () => this.merchant.getName();
}
