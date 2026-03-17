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
import { Biome, Dungeon, EncounterType } from "../constants";

const encounterTypes = Object.keys(EncounterType) as (keyof typeof EncounterType)[];

class EncounterBuilder {
    creatureFactory: CreatureFactory;

    constructor(creatureFactory: CreatureFactory) {
        this.creatureFactory = creatureFactory;
    }

    build(
        setting: Dungeon | Biome,
        pcs: PlayerCharacter[],
        narrator: Narrator,
        forceType?: EncounterType
    ) {
        const characters = pcs.map(pc => pc.getCharacter());
        const totalLvl = pcs.reduce((prev, curr) => prev + curr.lvl, 0);
        // Quest-specific forced type > instance-specific forced type > random type
        const encounterType = forceType || config.forceEncounterType
            || randInList(encounterTypes);
        switch (encounterType) {
        case (EncounterType.Combat): {
            const monsters = this.creatureFactory
                .createLeveledBiomeTypeMonsterList(characters, setting, totalLvl);
            return new CombatEncounter(characters, narrator, monsters);
        }
        case (EncounterType.Stealth): {
            const monsters = this.creatureFactory
                .createLeveledBiomeTypeMonsterList(characters, setting, totalLvl);
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

    buildCombatEncounter(
        setting: Dungeon | Biome,
        pcs: PlayerCharacter[],
        narrator: Narrator,
        totalLvl?: number
    ) {
        const characters = pcs.map(pc => pc.getCharacter());
        const encounterLvl = totalLvl || pcs.reduce((prev, curr) => prev + curr.lvl, 0);
        const monsters = this.creatureFactory
            .createLeveledBiomeTypeMonsterList(characters, setting, encounterLvl);
        return new CombatEncounter(characters, narrator, monsters);
    }

    buildBossEncounter(
        setting: Dungeon | Biome,
        pcs: PlayerCharacter[],
        narrator: Narrator,
        totalLvl?: number
    ) {
        const characters = pcs.map(pc => pc.getCharacter());
        const encounterLvl = totalLvl || pcs.reduce((prev, curr) => prev + curr.lvl, 0);
        const monsters = this.creatureFactory
            .createLeveledBiomeTypeBossList(characters, setting, encounterLvl);
        return new CombatEncounter(characters, narrator, monsters);
    }
}

export default EncounterBuilder;
