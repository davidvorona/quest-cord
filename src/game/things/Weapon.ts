import { BaseWeapon } from "../../types";
import Item from "./Item";

class Weapon extends Item {
    damage: number;

    properties: string[];

    constructor(data: BaseWeapon) {
        super(data);
        this.damage = data.damage;
        this.properties = data.properties || [];
    }

    getDamage() {
        return this.damage;
    }

    getProperties() {
        return this.properties;
    }
}

export default Weapon;
