import Character from "../game/Character";
import Encounter from "../game/Encounter";
import CombatEncounter from "../game/CombatEncounter";
import { randInList } from "../util";
import CreatureFactory from "./CreatureFactory";
import StealthEncounter from "../game/StealthEncounter";

const EncounterType = {
    Combat: "Combat",      // Typical combat encounter
    Stealth: "Stealth",    // WIP: Choose between avoiding or surprising monsters
    Social: "Social",      // WIP: An encounter that involves a social interaction
    Merchant: "Merchant",  // WIP: An encounter with a traveling merchant with goods for sale
    Lookout: "Lookout",    // WIP: Get to a vantage point for greater map visibility
    Nothing: "Nothing"     // WIP: A day where nothing happens, characters can rest and get buff
} as const;

class EncounterBuilder {
    creatureFactory: CreatureFactory;

    constructor(creatureFactory: CreatureFactory) {
        this.creatureFactory = creatureFactory;
    }

    build(biome: string, characters: Character[]) {
        const encounterType = randInList(Object.keys(EncounterType));
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
        default:
            return new Encounter(characters);
        }
    }
}

export default EncounterBuilder;
