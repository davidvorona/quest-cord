import { BaseWeapon } from "../../types";
import { WeaponProperty } from "../../constants";
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

    isRanged() {
        return this.properties.indexOf(WeaponProperty.Range) > -1;
    }
}

export default Weapon;
