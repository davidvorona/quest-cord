import Creature from "../../creatures/Creature";

export enum ActionRole {
    Actor,
    Target
}

export enum LogEntryAction {
    Spell = "Spell",
    Attack = "Attack",
    Use = "Use"
}

interface CombatLogEntry {
    action: LogEntryAction,
    method: string;
    value: number;
    /* [actorIdx, targetIdx] */
    creatures: [number, number?]
}

/**
 * An incremental log of the combat encounter, currently storing the action
 * taken, the method of action, the associated number value, and the
 * index of the actor and the target in a tuple: [actorIdx, targetIdx?].
 * The actual creature can be derived from these values and the turn order.
 */
export default class SmartCombatLog {
    turnOrder: Creature[];

    log: CombatLogEntry[] = [];

    constructor(turnOrder: Creature[]) {
        this.turnOrder = turnOrder;
    }

    append(action: LogEntryAction, method: string, value = 0, creatures: [number, number?]) {
        this.log.push({ action, method, value, creatures });
    }

    getCreatureTurnOrderIdx(creature: Creature) {
        return this.turnOrder.indexOf(creature);
    }

    /**
     * Takes a creature and finds the entry it was last targeted.
     */
    getLastTurnCreatureTargeted(creature: Creature) {
        // Get the turn order index of the creature
        const turnOrderIdx = this.turnOrder.indexOf(creature);
        const reversedLog = [...this.log].reverse();
        // Find the index of the last entry in the log where that index was the target index
        const lastEntryIdx = reversedLog
            .findIndex(e => e.creatures[ActionRole.Target] === turnOrderIdx);
        // Return the log entry at that index
        return reversedLog[lastEntryIdx];
    }

    /**
     * Takes a list of creatures and checks if any of them cast a spell on their
     * last turn.
     */
    getCreaturesCastingSpells(creatures: Creature[]) {
        // Get indexes of creatures in turn order
        const charIdx: number[] = [];
        this.turnOrder.forEach((creature, idx) => {
            if (creatures.indexOf(creature) > -1) {
                charIdx.push(idx);
            }
        });
        const casters: Creature[] = [];
        // Find if any of the creatures cast a spell in the last round
        charIdx.forEach((idx) => {
            const reversedLog = [...this.log].reverse();
            const charLastTurn = reversedLog
                .find(e => e.creatures[ActionRole.Actor] === idx);
            if (charLastTurn && charLastTurn.action === LogEntryAction.Spell) {
                casters.push(this.turnOrder[idx]);
            }
        });
        return casters;
    }
}
