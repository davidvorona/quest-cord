import { BaseArmor, ArmorSlot } from "../../types";
import Item from "./Item";

class Armor extends Item {
    ac: number = 0;

    slot: ArmorSlot;

    properties: string[];

    constructor(data: BaseArmor) {
        super(data);
        this.ac = data.ac;
        this.slot = data.slot;
        this.properties = data.properties || [];
    }

    getAC() {
        return this.ac;
    }

    getProperties() {
        return this.properties;
    }
}

export default Armor;
