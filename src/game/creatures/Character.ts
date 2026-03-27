import { BaseNonPlayerCharacter, CharacterClass } from "../../types";
import Creature, { Equipment } from "./Creature";
import Consumable from "../things/Consumable";
import Item from "../things/Item";
import Spell from "../things/Spell";
import Inventory from "./Inventory";

export default class Character extends Creature {
    inventory: Inventory;

    gp: number;

    immortal = false;

    constructor(
        args: CharacterClass | BaseNonPlayerCharacter,
        equipment: Equipment,
        spells: Spell[],
        items: Item[] = []
    ) {
        super(args, equipment, spells);

        this.inventory = new Inventory(items);
        this.gp = 12; // Starting gold
    }

    useItem(itemId: string) {
        const item = this.inventory.getItem(itemId);
        if (!item) {
            throw new Error("You do not have this item!");
        }
        if (item instanceof Consumable) {
            this.applyEffects(item.effects);
            this.inventory.removeItem(item.id);
        }
    }

    getInventory() {
        return this.inventory;
    }

    addToInventory(items: Item[]) {
        this.inventory.addItems(items);
    }

    getGp() {
        return this.gp;
    }

    getWeaponId() {
        return super.getWeaponId() || "fists";
    }

    makeImmortal() {
        this.immortal = !this.immortal;
    }

    setHp(hp: number) {
        if (this.immortal) {
            this.hp = this.maxHp;
        } else {
            super.setHp(hp);
        }
    }

    getAverageAcPerPiece() {
        // Filter out empty equipment slots
        const armorPieces = Object.values(this.equipment).filter(equip => !!equip);
        return this.getArmorClass() / armorPieces.length;
    }
}
