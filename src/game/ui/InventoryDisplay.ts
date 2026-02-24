import { ContainerBuilder } from "discord.js";
import Inventory from "../creatures/Inventory";
import Character from "../creatures/Character";
import NonPlayerCharacter from "../NonPlayerCharacter";

function InventoryContainer(title: string, subtitle: string) {
    return new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`# ${title}`))
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`### ${subtitle}`))
        .addSeparatorComponents(separator => separator);
}

function getInventoryLineItems(inventory: Inventory) {
    const quantities = inventory.getQuantities();
    return quantities.map(q => {
        const dotLeaders = ".".repeat(Math.max(0, 30 - q.item.name.length));
        return `*${q.item.name}* x${q.quantity}${dotLeaders}`
            + `:coin: **${q.item.value}**ea`;
    });
}

export default function InventoryDisplay(character: Character) {
    const quantities = character.getInventory().getQuantities();
    const gp = character.getGp();
    const description = `*${Object.keys(quantities).length} / ${Inventory.MAX_SIZE}*`;
    const container = InventoryContainer("Inventory", `:coin: ${gp} gold (${description})`);
    const lineItems = getInventoryLineItems(character.getInventory());
    lineItems.forEach((lineItem, idx) => {
        container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(lineItem));
        if (idx < quantities.length - 1) {
            container.addSeparatorComponents(separator => separator);
        }
    });
    if (quantities.length === 0) {
        container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("*Inventory is empty*"));
    }
    return container;
}

export const ShopInventoryDisplay = function ShopInventoryDisplay(merchant: NonPlayerCharacter) {
    const quantities = merchant.getCharacter().getInventory().getQuantities();
    const gp = merchant.getCharacter().getGp();
    const container = InventoryContainer(
        `${merchant.getName()}'s Shop`,
        `Seller has :coin: ${gp} gold`
    );
    const lineItems = getInventoryLineItems(merchant.getCharacter().getInventory());
    lineItems.forEach((lineItem, idx) => {
        container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(lineItem));
        if (idx < quantities.length - 1) {
            container.addSeparatorComponents(separator => separator);
        }
    });
    if (quantities.length === 0) {
        container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("*Shop is empty*"));
    }
    return container;
};
