import Character from "../game/creatures/Character";
import { BaseMonster, MonsterData } from "../types";
import { rand, randInList } from "../util";

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
        const diff = rand(maxV);
        let result = 0;
        const signedness = rand(1);
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
        const bosses = this.monsters.filter((m) => m.lvl === bossLvl);
        const boss = randInList(bosses);
        // Minion level can't be below 1
        const minionLvl = avgLvl - bossV < 1 ? 1 : avgLvl - bossV;
        const minions = this.monsters.filter((m) => m.lvl === minionLvl);
        const minion = randInList(minions);
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
        monsters.sort((a, b) => {
            const varianceA = Math.abs(a.hp - seedHp);
            const varianceB = Math.abs(b.hp - seedHp);
            return varianceA - varianceB;
        });
        // Pick the monster with the least variance
        const monster = monsters[0];
        return new Array(count).fill(monster);
    }

    private pickByTotalDamage() {
        const count = this.characters.length + 1 + this.createVariance(1);
        const totalPartyDamage = this.characters.reduce((prev, curr) => prev + curr.damage, 0);
        const seedDamage = totalPartyDamage / count;
        const monsters = [...this.monsters];
        // Sort by variance from seedDamage
        monsters.sort((a, b) => {
            const varianceA = Math.abs(a.damage - seedDamage);
            const varianceB = Math.abs(b.damage - seedDamage);
            return varianceA - varianceB;
        });
        const monster = monsters[0];
        return new Array(count).fill(monster);
    }

    private pickByTotalLevel() {
        const count = this.characters.length + 1 + this.createVariance(1);
        const seedLevel = this.totalLvl / count;
        const monsters = [...this.monsters];
        // Sort by variance from seedLevel
        monsters.sort((a, b) => {
            const varianceA = Math.abs(a.lvl - seedLevel);
            const varianceB = Math.abs(b.lvl - seedLevel);
            return varianceA - varianceB;
        });
        const monster = monsters[0];
        return new Array(count).fill(monster);
    }
}
