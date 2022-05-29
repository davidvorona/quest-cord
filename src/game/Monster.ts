import Creature from "./Creature";

export default class Monster extends Creature {
    setHp(hp: number) {
        this.state.hp = hp;
    }
}
