import Creature from "./Creature";

export default class Monster extends Creature {
    getHp() {
        return this.data.hp;
    }

    setHp(hp: number) {
        this.data.hp = hp;
    }
}
