import Creature from "../game/creatures/Creature";

export const ATTACKER_IDX = 0;
export const TARGET_IDX = 1;

/**
 * An incremental log of the combat encounter, currently only storing the
 * index of the attacker and the target in a tuple: [attackerIdx, targetIdx].
 * The actual creature can be derived from these values and the turn order.
 */
export default class SmartCombatLog {
    turnOrder: Creature[];

    /* [ [attackerIdx, targetIdx], ... ] */
    log: [number, number][] = [];

    constructor(turnOrder: Creature[]) {
        this.turnOrder = turnOrder;
    }

    append(attackerIdx: number, targetIdx: number) {
        this.log.push([attackerIdx, targetIdx]);
    }

    getLastTurnCreatureTargeted(creature: Creature) {
        // Get the turn order index of the creature
        const turnOrderIdx = this.turnOrder.indexOf(creature);
        const reversedLog = [...this.log].reverse();
        // Find the index of the last entry in the log where that index was the target index
        const lastEntryIdx = reversedLog.findIndex(e => e[TARGET_IDX] === turnOrderIdx);
        // Return the log entry at that index
        return reversedLog[lastEntryIdx];
    }
}
