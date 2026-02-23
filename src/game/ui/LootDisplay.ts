import { ContainerBuilder } from "discord.js";
import PlayerCharacter from "../PlayerCharacter";
import Inventory from "../creatures/Inventory";
import { Loot } from "../../services/LootBox";

export default function LootDisplay(loot: Loot, pc: PlayerCharacter) {
    const components = [];
    const inventorySize = pc.getCharacter().getInventory().getItems().length;
    const itemCounts = loot.items.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const container = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("# New loot added to inventory!"))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay
                    .setContent(`### :school_satchel: ${inventorySize} / ${Inventory.MAX_SIZE}`))
                .setThumbnailAccessory((thumbnail) =>
                    thumbnail
                        .setURL("attachment://inventory.png")
                        .setDescription("alt text inventory")))
        .addSeparatorComponents(separator => separator);
    if (loot.gp > 0) {
        container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`### :coin: + ${loot.gp} gold`));
    }
    Object.entries(itemCounts).forEach(([itemName, count]) => {
        container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`### :sparkles: + ${itemName} x${count}`));
    });
    components.push(container);
    return components;
}
