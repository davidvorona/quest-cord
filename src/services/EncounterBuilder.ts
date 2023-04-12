import Character from "../game/Character";
import Encounter from "../game/Encounter";
import CombatEncounter from "../game/CombatEncounter";
import StealthEncounter from "../game/StealthEncounter";
import SocialEncounter from "../game/SocialEncounter";
import MerchantEncounter from "../game/MerchantEncounter";
import LookoutEncounter from "../game/LookoutEncounter";
import RestEncounter from "../game/RestEncounter";
import CreatureFactory from "./CreatureFactory";
import { randInList } from "../util";
import config from "../config";

const EncounterType = {
    Combat: "Combat",      // Typical combat encounter
    Stealth: "Stealth",    // WIP: Choose between avoiding or surprising monsters
    Social: "Social",      // WIP: An encounter that involves a social interaction
    Merchant: "Merchant",  // WIP: An encounter with a traveling merchant with goods for sale
    Lookout: "Lookout",    // WIP: Get to a vantage point for greater map visibility
    Rest: "Rest"            // WIP: A day where nothing happens, characters can rest and get buff
} as const;

class EncounterBuilder {
    creatureFactory: CreatureFactory;

    constructor(creatureFactory: CreatureFactory) {
        this.creatureFactory = creatureFactory;
    }

    build(biome: string, characters: Character[]) {
        const encounterType = config.forceEncounterType || randInList(Object.keys(EncounterType));
        switch (encounterType) {
        case (EncounterType.Combat): {
            const monsters = this.creatureFactory
                .createRandomBiomeTypeMonsterList(characters.length, biome);
            return new CombatEncounter(characters, monsters);
        }
        case (EncounterType.Stealth): {
            const monsters = this.creatureFactory
                .createRandomBiomeTypeMonsterList(characters.length, biome);
            return new StealthEncounter(characters, monsters);
        }
        case (EncounterType.Social): {
            const npcs = this.creatureFactory.createRandomNpcList(1);
            return new SocialEncounter(characters, npcs);
        }
        case (EncounterType.Merchant): {
            const merchant = this.creatureFactory.createRandomMerchant();
            return new MerchantEncounter(characters, merchant);
        }
        case (EncounterType.Lookout): {
            return new LookoutEncounter(characters);
        }
        case (EncounterType.Rest): {
            return new RestEncounter(characters);
        }
        default:
            return new Encounter(characters);
        }
    }
}

export default EncounterBuilder;
