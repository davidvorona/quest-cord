import { COMPENDIUM_SECTION } from "../constants";
import Spell from "../game/things/Spell";
import { BaseSpell } from "../types";
import CompendiumReader from "./CompendiumReader";

class SpellFactory {
    compendium: CompendiumReader;

    data: Record<string, BaseSpell>;

    constructor(compendiumReader: CompendiumReader) {
        this.compendium = compendiumReader;
        this.data = this.compendium.read(COMPENDIUM_SECTION.SPELLS);
    }

    create(spellId: string) {
        const data = this.data[spellId];
        if (!data) {
            throw new Error(`Invalid spell ID: ${spellId}`);
        }
        return new Spell(data as BaseSpell);
    }

    hydrateList(spellIds: string[] = []) {
        return spellIds.map(id => this.create(id));
    }
}

export default SpellFactory;
