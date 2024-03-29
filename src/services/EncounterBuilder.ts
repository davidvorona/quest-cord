import Character from "../game/creatures/Character";
import Narrator from "../game/Narrator";
import Encounter from "../game/encounters/Encounter";
import CombatEncounter from "../game/encounters/combat/CombatEncounter";
import StealthEncounter from "../game/encounters/stealth/StealthEncounter";
import SocialEncounter from "../game/encounters/social/SocialEncounter";
import MerchantEncounter from "../game/encounters/merchant/MerchantEncounter";
import LookoutEncounter from "../game/encounters/lookout/LookoutEncounter";
import RestEncounter from "../game/encounters/rest/RestEncounter";
import CreatureFactory from "./CreatureFactory";
import { randInList } from "../util";
import config from "../config";
import { EncounterType } from "../constants";

class EncounterBuilder {
    creatureFactory: CreatureFactory;

    constructor(creatureFactory: CreatureFactory) {
        this.creatureFactory = creatureFactory;
    }

    build(biome: string, characters: Character[], narrator: Narrator, forceType?: string) {
        // Quest-specific forced type > instance-specific forced type > random type
        const encounterType = forceType || config.forceEncounterType
            || randInList(Object.keys(EncounterType));
        switch (encounterType) {
        case (EncounterType.Combat): {
            const monsters = this.creatureFactory
                .createRandomBiomeTypeMonsterList(characters.length, biome);
            return new CombatEncounter(characters, narrator, monsters);
        }
        case (EncounterType.Stealth): {
            const monsters = this.creatureFactory
                .createRandomBiomeTypeMonsterList(characters.length, biome);
            return new StealthEncounter(characters, narrator, monsters);
        }
        case (EncounterType.Social): {
            const npcs = this.creatureFactory.createRandomNpcList(1);
            return new SocialEncounter(characters, narrator, npcs);
        }
        case (EncounterType.Merchant): {
            const merchant = this.creatureFactory.createRandomMerchant();
            return new MerchantEncounter(characters, narrator, merchant);
        }
        case (EncounterType.Lookout): {
            return new LookoutEncounter(characters, narrator);
        }
        case (EncounterType.Rest): {
            return new RestEncounter(characters, narrator);
        }
        default:
            return new Encounter(characters, narrator);
        }
    }
}

export default EncounterBuilder;
