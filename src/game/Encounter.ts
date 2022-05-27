import PlayerCharacter from "./PlayerCharacter";
import Monster from "./Monster";
import Creature from "./Creature";

export default class Encounter {
    pcs: PlayerCharacter[];

    npcs = [];

    monsters: Monster[] = [];

    turnOrder: Creature[] = [];

    constructor(pcs: PlayerCharacter[], monsters: Monster[]) {
        this.pcs = pcs;
        this.monsters = monsters;
        this.turnOrder = [...pcs, ...monsters];
        console.info("Encounter started...", pcs, "vs", monsters);
    }

    getMonsterByIndex(index: number): Monster {
        return this.monsters[index];
    }

    getMonsterNames = () => this.monsters.map(m => m.state.name);
}
