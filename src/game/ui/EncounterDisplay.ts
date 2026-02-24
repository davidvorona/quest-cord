import { ButtonStyle, ContainerBuilder } from "discord.js";
import Encounter from "../encounters/Encounter";
import PlayerCharacter from "../PlayerCharacter";
import { Biome } from "../../types";
import { EncounterType } from "../../constants";
import CombatEncounter from "../encounters/combat/CombatEncounter";
import MerchantEncounter from "../encounters/merchant/MerchantEncounter";
import SocialEncounter from "../encounters/social/SocialEncounter";

const encounterTypeColor: Record<EncounterType, number> = {
    [EncounterType.Social]: 0x0099ff,       // Blue
    [EncounterType.Combat]: 0xff0000,       // Red
    [EncounterType.Stealth]: 0x000000,      // Black
    [EncounterType.Lookout]: 0xffff00,      // Yellow
    [EncounterType.Merchant]: 0x800080,     // Purple
    [EncounterType.Rest]: 0x00ff00,         // Green
    [EncounterType.Unspecified]: 0x808080   // Gray
};

export default function EncounterDisplay(encounter: Encounter, biome: Biome, pc?: PlayerCharacter) {
    const encounterDesc = encounter.getDescription() || "Exploring...";
    const names = encounter.getCharacterNames();
    const components = [];
    const container = new ContainerBuilder()
        .setAccentColor(encounterTypeColor[encounter.type])
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`# ${encounterDesc}`))
        .addSeparatorComponents(separator => separator);
    if (encounter instanceof CombatEncounter) {
        const turnOrder = encounter.getTurnOrderNames()
            .reduce((acc, curr, idx) => `${acc}\n**${idx + 1}.** ${curr}`, "");
        container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("### :repeat: Turn Order"),
        (textDisplay) => textDisplay
            .setContent(turnOrder));
    }

    container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(names.length > 1 ? "In a party" : "Lone adventurer"),
    (textDisplay) => textDisplay
        .setContent(names.map(name => `:bust_in_silhouette: **${name}**`).join("\n")));
    if (encounter instanceof MerchantEncounter) {
        container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("Traveling merchant"),
        (textDisplay) => textDisplay
            .setContent(`:person_shrugging: **${encounter.getMerchantName()}**`));
    } else if (encounter instanceof SocialEncounter) {
        container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("Another traveler"),
        (textDisplay) => textDisplay.setContent(
            encounter.getNpcNames().map(name => `:bust_in_silhouette: **${name}**`).join("\n")));
    }

    container.addSeparatorComponents(separator => separator)
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
                    .setCustomId("quest")
                    .setLabel("See Quest")
                    .setStyle(ButtonStyle.Secondary)));
    components.push(container);
    return components;
}
