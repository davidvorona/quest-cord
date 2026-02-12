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
 * The actual creature ID can be derived from these values and the turn order.
 * Instances of this class are primarily used for monster AI.
 */
export default class SmartCombatLog {
    turnOrder: string[];

    log: CombatLogEntry[] = [];

    constructor(turnOrder: string[]) {
        this.turnOrder = turnOrder;
    }

    static getEntryActor(entry: CombatLogEntry) {
        return entry.creatures[ActionRole.Actor];
    }

    static getEntryTarget(entry: CombatLogEntry) {
        return entry.creatures[ActionRole.Target];
    }

    append(action: LogEntryAction, method: string, value = 0, creatures: [number, number?]) {
        this.log.push({ action, method, value, creatures });
    }

    appendAttack(method: string, value = 0, creatures: [number, number?]) {
        this.append(LogEntryAction.Attack, method, value, creatures);
    }

    appendSpell(method: string, value = 0, creatures: [number, number?]) {
        this.append(LogEntryAction.Spell, method, value, creatures);
    }

    appendUse(method: string, value = 0, creatures: [number, number?]) {
        this.append(LogEntryAction.Use, method, value, creatures);
    }

    getCreatureTurnOrderIdx(creatureId: string) {
        return this.turnOrder.indexOf(creatureId);
    }

    /**
     * Takes a creature and finds the entry it was last targeted.
     */
    getLastTurnCreatureTargeted(creatureId: string) {
        // Get the turn order index of the creature
        const turnOrderIdx = this.turnOrder.indexOf(creatureId);
        const reversedLog = [...this.log].reverse();
        // Find the index of the last entry in the log where that index was the target index
        const lastEntryIdx = reversedLog
            .findIndex(e => SmartCombatLog.getEntryTarget(e) === turnOrderIdx);
        // Return the log entry at that index
        return reversedLog[lastEntryIdx];
    }

    /**
     * Takes a list of creatures and checks if any of them cast a spell on their
     * last turn. Returns a list of IDs of creatures that cast spells.
     */
    getCreaturesCastingSpells(creatureIds: string[]) {
        // Get indexes of creatures in turn order
        const charIdx: number[] = [];
        this.turnOrder.forEach((creatureId, idx) => {
            if (creatureIds.indexOf(creatureId) > -1) {
                charIdx.push(idx);
            }
        });
        const casterIds: string[] = [];
        // Find if any of the creatures cast a spell in the last round
        charIdx.forEach((idx) => {
            const reversedLog = [...this.log].reverse();
            const charLastTurn = reversedLog
                .find(e => SmartCombatLog.getEntryActor(e) === idx);
            if (charLastTurn && charLastTurn.action === LogEntryAction.Spell) {
                casterIds.push(this.turnOrder[idx]);
            }
        });
        return casterIds;
    }
}
