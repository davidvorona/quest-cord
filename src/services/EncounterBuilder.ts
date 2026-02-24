import PlayerCharacter from "../game/PlayerCharacter";
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

const encounterTypes = Object.keys(EncounterType) as (keyof typeof EncounterType)[];

class EncounterBuilder {
    creatureFactory: CreatureFactory;

    constructor(creatureFactory: CreatureFactory) {
        this.creatureFactory = creatureFactory;
    }

    build(biome: string, pcs: PlayerCharacter[], narrator: Narrator, forceType?: string) {
        const characters = pcs.map(pc => pc.getCharacter());
        const totalLvl = pcs.reduce((prev, curr) => prev + curr.lvl, 0);
        // Quest-specific forced type > instance-specific forced type > random type
        const encounterType = forceType || config.forceEncounterType
            || randInList(encounterTypes);
        switch (encounterType) {
        case (EncounterType.Combat): {
            const monsters = this.creatureFactory
                .createLeveledBiomeTypeMonsterList(characters, biome, totalLvl);
            return new CombatEncounter(characters, narrator, monsters);
        }
        case (EncounterType.Stealth): {
            const monsters = this.creatureFactory
                .createLeveledBiomeTypeMonsterList(characters, biome, totalLvl);
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
