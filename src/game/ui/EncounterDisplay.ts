import { ButtonStyle, ContainerBuilder } from "discord.js";
import Encounter from "../encounters/Encounter";
import PlayerCharacter from "../PlayerCharacter";
import { Biome } from "../../types";
import EncounterButtonRows from "./EncounterButtonRows";

export default function EncounterDisplay(encounter: Encounter, biome: Biome, pc?: PlayerCharacter) {
    const encounterDesc = encounter.getDescription() || "Exploring...";
    const names = encounter.getCharacterNames();
    const components = [];
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`# ${encounterDesc}`))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(pc
                    ? `### :heart: ${pc?.getCharacter().hp} / ${pc?.getCharacter().maxHp}`
                    : "Traveling..."
                ),
            (textDisplay) => textDisplay
                .setContent(`### :map: ${
                    biome === "beach" ? "At" : "In"
                } the ${biome}`))
                .setButtonAccessory(button => button
                    .setCustomId("map")
                    .setLabel("See Local Map")
                    .setStyle(ButtonStyle.Secondary)))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(names.length > 1 ? "In a party" : "Lone adventurer"),
            (textDisplay) => textDisplay
                .setContent(names.map(name => `:bust_in_silhouette: **${name}**\n`).join(", ")))
                .setButtonAccessory(button => button
                    .setCustomId("quest")
                    .setLabel("See Quest")
                    .setStyle(ButtonStyle.Primary)));
    components.push(container);
    if (Object.keys(encounter.buttons).length > 0) {
        const buttonRows = EncounterButtonRows(encounter.buttons);
        components.push(...buttonRows);
    }
    return components;
}
