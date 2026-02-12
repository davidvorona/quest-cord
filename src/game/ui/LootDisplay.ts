import { ContainerBuilder } from "discord.js";
import Item from "../things/Item";
import PlayerCharacter from "../PlayerCharacter";
import Inventory from "../creatures/Inventory";

export default function LootDisplay(item: Item, pc: PlayerCharacter) {
    const components = [];
    const inventorySize = pc.getCharacter().getInventory().getItems().length;
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
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
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`### :sparkles: + ${item.name} x1`));
    components.push(container);
    return components;
}
