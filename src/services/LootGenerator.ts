import PlayerCharacter from "../game/PlayerCharacter";
import { DungeonSize } from "../game/Dungeon";
import LootBox, { LootType } from "./LootBox";
import ItemFactory from "./ItemFactory";
import Item from "../game/things/Item";

class LootGenerator {
    itemFactory: ItemFactory;

    constructor(itemFactory: ItemFactory) {
        this.itemFactory = itemFactory;
    }

    generateEncounterLoot(pcs: PlayerCharacter[], lootTable: Item[]) {
        const loot: LootBox[] = [];
        pcs.forEach((pc) => {
            loot.push(new LootBox(pc.userId, LootType.Encounter, lootTable));
        });
        return loot;
    }

    static getDungeonScalingTerm(dungeonSize: DungeonSize) {
        switch (dungeonSize) {
        case DungeonSize.Short:
            return 1;
        case DungeonSize.Medium:
            return 2;
        case DungeonSize.Long:
            return 3;
        default:
            return 0;
        }
    }

    generateDungeonLoot(pcs: PlayerCharacter[], dungeonSize: DungeonSize) {
        const loot: LootBox[] = [];
        pcs.forEach((pc) => {
            const char = pc.getCharacter();
            // Create a random weapon +1 the level of their current weapon
            const weapon = this.itemFactory.createRandomScaledWeapon(
                (char.getWeapon()?.damage || 0) + LootGenerator.getDungeonScalingTerm(dungeonSize)
            );
            // Create a random armor piece +1 the level of their current avg AC
            const armor = this.itemFactory.createRandomScaledArmor(
                char.getAverageAcPerPiece() + LootGenerator.getDungeonScalingTerm(dungeonSize)
            );
            // Create a random consumable
            const consumable = this.itemFactory.createRandomConsumable();
            const lootTable = [weapon, armor, consumable];
            loot.push(new LootBox(pc.userId, LootType.Dungeon, lootTable));
        });
        return loot;
    }
}

export default LootGenerator;
