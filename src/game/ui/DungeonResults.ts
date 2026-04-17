import { ButtonStyle, ContainerBuilder } from "discord.js";
import { LootType } from "../../services/LootBox";
import { Dungeon } from "../../constants";

export default function DungeonResults(dungeonType: Dungeon) {
    const dungeonFormatted = dungeonType.charAt(0).toUpperCase() + dungeonType.slice(1);
    const components = [];
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`# ${dungeonFormatted} cleared!`))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent("Loot"),
            (textDisplay) => textDisplay
                .setContent("*At the end of the dungeon, you find a chest of valuables...*"))
                .setButtonAccessory(button => button
                    .setCustomId(`loot-${LootType.Dungeon}`)
                    .setLabel("🎲 Loot the Chest")
                    .setStyle(ButtonStyle.Success)));
    components.push(container);
    return components;
}
