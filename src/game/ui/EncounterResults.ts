import { ButtonStyle, ContainerBuilder } from "discord.js";
import { EncounterResults } from "../encounters/Encounter";
import { EncounterType } from "../../constants";

export default function EncounterResults(
    encounterType: EncounterType,
    encounterResults: EncounterResults
) {
    const components = [];
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`# ${encounterType} results`))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("Experience"),
        (textDisplay) => textDisplay
            .setContent(`### :fireworks: +${encounterResults.xp} xp`));
    if (encounterResults.loot) {
        container.addSeparatorComponents(separator => separator)
            .addSectionComponents((section) =>
                section.addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent("Loot"),
                (textDisplay) => textDisplay
                    .setContent("*You find some random loot on the monster...*"))
                    .setButtonAccessory(button => button
                        .setCustomId("loot")
                        .setLabel("🎲 Roll for Loot")
                        .setStyle(ButtonStyle.Success)));
    }
    components.push(container);
    return components;
}
