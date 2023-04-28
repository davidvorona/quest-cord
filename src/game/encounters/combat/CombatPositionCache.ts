import Character from "../../creatures/Character";
import Monster from "../../creatures/Monster";

export enum CombatPosition {
    Melee,
    Range
}

export default class CombatPositionCache {
    cache: { [id: string]: CombatPosition } = {};

    constructor(characters: Character[], monsters: Monster[]) {
        characters.forEach((char) => {
            this.cache[char.id] = CombatPosition.Range;
        });
        monsters.forEach((monster) => {
            this.cache[monster.id] = CombatPosition.Range;
        });
    }

    getCreaturePosition(creatureId: string) {
        return this.cache[creatureId];
    }

    moveCreature(creatureId: string) {
        const currentPosition = this.cache[creatureId];
        if (currentPosition === CombatPosition.Melee) {
            this.cache[creatureId] = CombatPosition.Range;
        } else if (currentPosition === CombatPosition.Range) {
            this.cache[creatureId] = CombatPosition.Melee;
        }
    }

    compareEnemyPositions(creature1Id: string, creature2Id: string) {
        // If they don't equal each other, they are obviously not equal
        if (this.cache[creature1Id] !== this.cache[creature2Id]) {
            return false;
        }
        // If they are both Range, we treat that as unequal
        if (this.cache[creature1Id] === CombatPosition.Range) {
            return false;
        }
        // Otherwise, they are both in Melee
        return true;
    }
}
