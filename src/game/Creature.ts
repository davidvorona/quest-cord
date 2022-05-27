import { CreatureData } from "../types";

export default class Creature {
    data: CreatureData;

    state: CreatureData;

    constructor(data: CreatureData) {
        this.data = data;
        this.state = { ...data };
    }
}
