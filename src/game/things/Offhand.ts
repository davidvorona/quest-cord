import { BaseOffhand } from "../../types";
import Item from "./Item";

class Offhand extends Item {
    damage: number;

    ac: number;

    properties: string[];

    constructor(data: BaseOffhand) {
        super(data);
        this.damage = data.damage;
        this.ac = data.ac;
        this.properties = data.properties || [];
    }

    getDamage() {
        return this.damage;
    }

    getProperties() {
        return this.properties;
    }
}

export default Offhand;
