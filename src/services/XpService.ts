// Used this formula: https://sumrndmdde.github.io/EXP-Calculator
class XpService {
    private readonly accelerationA = 30;

    private readonly accelerationB = 30;

    private readonly baseValue = 30;

    private readonly extraValue = 20;

    // For temporary XP multipliers
    multiplier: number;

    constructor(multiplier = 1) {
        this.multiplier = multiplier;
    }

    setMultiplier(multiplier: number) {
        this.multiplier = multiplier;
    }

    /**
     * Gets total XP necessary to get to given level from level 1.
     */
    getExperienceForLevel(lvl: number): number {
        return Math.round(
            (this.baseValue // Start with baseValue,
            // then multiply by the previous level to a power that is factor of accelerationA,
            * (Math.pow(lvl - 1, 0.9 + this.accelerationA / 250))
            * lvl // by the current level,
            * (lvl + 1) // and by the next level.
            // Divide by a factor of the current level and accelerationB,
            / (6 + Math.pow(lvl, 2) / 50 / this.accelerationB)
            // and add the previous level multiplied by extraValue.
            + (lvl - 1) * this.extraValue)
        );
    }

    /**
     * Calculates the XP to get to next level from given level.
     */
    getExperienceForNextLevel(lvl: number): number {
        return this.getExperienceForLevel(lvl + 1) - this.getExperienceForLevel(lvl);
    }

    /**
     * Returns an object with the level and current XP of the player after
     * applying the XP gain.
     */
    gainExperience(lvl: number, xp: number, xpGain: number) {
        const newXp = xp + (xpGain * this.multiplier);
        const result = { xp: newXp, lvl };
        const xpForNextLvl = this.getExperienceForNextLevel(lvl);
        if (newXp >= xpForNextLvl) {
            result.lvl += 1;
            result.xp = newXp - xpForNextLvl;
        }
        return result;
    }
}

export default XpService;

export const defaultXpService = new XpService();
