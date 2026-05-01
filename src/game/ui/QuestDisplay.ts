import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
} from "discord.js";
import PlayerCharacter from "../PlayerCharacter";
import Quest from "../Quest";
import World from "../World";

export default function QuestDisplay(world: World, quest: Quest, pc: PlayerCharacter) {
    const className = pc.getCharacter().baseId;

    const coords = quest.getPartyCoordinates();
    const direction = world.getDirectionFromTwoCoordinates(
        quest.getPartyLastCoordinates(), coords) || "nowhere";
    const biome = world.getBiome(coords);
    const encounterDesc = quest.getEncounter()?.getDescription() || "Exploring...";

    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("# Questing - *Day 1*"))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(":scroll: *Character*"),
            (textDisplay) => textDisplay.setContent(`## ${pc.getName()}`),
            (textDisplay) => textDisplay.setContent(`### Level ${pc.lvl} ${className}`))
                .setThumbnailAccessory((thumbnail) =>
                    thumbnail
                        .setURL(`attachment://${className}.png`)
                        .setDescription(`alt text ${className}`)))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(":map: *Bearings*"),
            (textDisplay) => textDisplay
                .setContent(`### ${
                    biome === "beach" ? "At" : "In"
                } the ${biome}, heading ${direction}`),
            (textDisplay) => textDisplay.setContent(encounterDesc))
                .setButtonAccessory(button => button
                    .setCustomId("map")
                    .setLabel("See Local Map")
                    .setStyle(ButtonStyle.Secondary)));
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("character")
            .setLabel("See Character")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("inventory")
            .setLabel("View Inventory")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("encounter")
            .setLabel("View Encounter")
            .setStyle(ButtonStyle.Danger)
    );
    return [container, buttonRow];
}
