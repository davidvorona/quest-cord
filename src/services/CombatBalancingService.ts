import Character from "../game/creatures/Character";
import { BaseMonster, MonsterData } from "../types";
import { rand, randInList, sortByVariance } from "../util";

enum BalancingStrategy {
    BossAndMinions = "BossAndMinions",
    Hitpoints = "Hitpoints",
    Damage = "Damage",
    Level = "Level"
}

export default class CombatBalancingService {
    monsterData: MonsterData;

    monsters: BaseMonster[];

    totalLvl: number;

    characters: Character[];

    strategy?: BalancingStrategy;

    constructor(characters: Character[], monsterData: MonsterData, totalLvl: number) {
        this.monsterData = monsterData;
        this.monsters = Object.values(monsterData);
        this.characters = characters;
        this.totalLvl = totalLvl;
    }

    pickStrategy() {
        const strategies = Object.values(BalancingStrategy);
        if (this.totalLvl / this.characters.length < 3) {
            // No bosses allowed for low level parties
            const index = strategies.indexOf(BalancingStrategy.BossAndMinions);
            strategies.splice(index, 1);
        }
        this.strategy = randInList(strategies);
        return this.strategy;
    }

    createMonsterList() {
        if (!this.strategy) {
            throw new Error("Balancing strategy not chosen, aborting");
        }
        switch (this.strategy) {
        case BalancingStrategy.BossAndMinions:
            return this.pickBossAndMinions();
        case BalancingStrategy.Hitpoints:
            return this.pickByTotalHitpoints();
        case BalancingStrategy.Damage:
            return this.pickByTotalDamage();
        case BalancingStrategy.Level:
            return this.pickByTotalLevel();
        default:
            return this.pickByTotalLevel();
        }
    }

    private createVariance(maxV: number) {
        const diff = rand(maxV + 1);
        let result = 0;
        const signedness = rand(2);
        if (signedness) {
            result += diff;
        } else {
            result -= diff;
        }
        return result;
    }

    private pickBossAndMinions() {
        const bossV = 2;
        const avgLvl = this.totalLvl / this.characters.length;
        const bossLvl = avgLvl + bossV;
        const monsters = [...this.monsters];
        // Sort by variance from target level
        sortByVariance(monsters, "lvl", bossLvl);
        const boss = randInList(monsters);
        // Minion level can't be below 1
        const minionLvl = avgLvl - bossV < 1 ? 1 : avgLvl - bossV;
        // Sort by variance from minion level
        sortByVariance(monsters, "lvl", minionLvl);
        const minion = randInList(monsters);
        // Boss + minion count equals player count
        return [boss, ...new Array(this.characters.length - 1).fill(minion)];
    }

    private pickByTotalHitpoints() {
        // Variance for monster count is only +/- 1
        const count = this.characters.length + 1 + this.createVariance(1);
        const totalPartyHp = this.characters.reduce((prev, curr) => prev + curr.maxHp, 0);
        const seedHp = totalPartyHp / count;
        const monsters = [...this.monsters];
        // Sort by variance from seedHp
        sortByVariance(monsters, "hp", seedHp);
        const monster = monsters[0];
        return new Array(count).fill(monster);
    }

    private pickByTotalDamage() {
        const count = this.characters.length + 1 + this.createVariance(1);
        const totalPartyDamage = this.characters.reduce((prev, curr) => prev + curr.damage, 0);
        const seedDamage = totalPartyDamage / count;
        const monsters = [...this.monsters];
        // Sort by variance from seedDamage
        sortByVariance(monsters, "damage", seedDamage);
        const monster = monsters[0];
        return new Array(count).fill(monster);
    }

    private pickByTotalLevel() {
        const count = this.characters.length + 1 + this.createVariance(1);
        const seedLevel = this.totalLvl / count;
        const monsters = [...this.monsters];
        // Sort by variance from seedLevel
        sortByVariance(monsters, "lvl", seedLevel);
        const monster = monsters[0];
        return new Array(count).fill(monster);
    }
}

export const BossBalancingService = class BossBalancingService extends CombatBalancingService {
    strategy = BalancingStrategy.BossAndMinions;

    constructor(characters: Character[], monsterData: MonsterData, totalLvl: number) {
        super(characters, monsterData, totalLvl);
    }
};
