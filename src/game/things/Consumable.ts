import { BaseConsumable, Effects } from "../../types";
import Item from "./Item";

export default class Consumable extends Item {
    effects: Effects;

    duration?: number;

    constructor(data: BaseConsumable) {
        super(data);
        this.effects = data.effects;
        this.duration = data.duration;
    }
}
