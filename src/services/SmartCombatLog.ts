import Creature from "../game/creatures/Creature";

export enum ActionRoleIndex {
    Actor,
    Target
}

export enum LogEntryAction {
    Spell = "Spell",
    Attack = "Attack",
    Use = "Use"
}

/**
 * An incremental log of the combat encounter, currently storing type of
 * action taken, the selected action, the associated damage number, and the
 * index of the attacker and the target in a tuple: [attackerIdx, targetIdx?].
 * The actual creature can be derived from these values and the turn order.
 */
export default class SmartCombatLog {
    turnOrder: Creature[];

    log: {
        action: string,
        value: string;
        damage: number;
        /* [ [attackerIdx, targetIdx], ... ] */
        creatures: [number, number?]
    }[] = [];

    constructor(turnOrder: Creature[]) {
        this.turnOrder = turnOrder;
    }

    append(action: string, value: string, damage = 0, creatures: [number, number?]) {
        this.log.push({ action, value, damage, creatures });
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
            .findIndex(e => e.creatures[ActionRoleIndex.Target] === turnOrderIdx);
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
                .find(e => e.creatures[ActionRoleIndex.Actor] === idx);
            if (charLastTurn && charLastTurn.action === LogEntryAction.Spell) {
                casters.push(this.turnOrder[idx]);
            }
        });
        return casters;
    }
}
