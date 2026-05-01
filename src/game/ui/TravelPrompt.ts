import {
    ButtonStyle,
    ContainerBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import { Biome, Direction } from "../../constants";
import World from "../World";

export default function TravelPrompt(biome: Biome, votesDisplayText?: string) {
    const { emoji } = World.getBiomeData(biome);
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) => textDisplay
            .setContent("# Where would you like to go? :person_walking_facing_right:"))
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) => textDisplay
            .setContent("Currently"),
        (textDisplay) => textDisplay.setContent(
            `### ${emoji} ${biome === "beach" ? "At" : "In"} the ${biome}`)
        )
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("choose-direction")
                    .setPlaceholder("Choose a direction")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(Direction.North)
                            .setValue(Direction.North)
                            .setDescription("Travel north"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(Direction.South)
                            .setValue(Direction.South)
                            .setDescription("Travel south"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(Direction.East)
                            .setValue(Direction.East)
                            .setDescription("Travel east"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(Direction.West)
                            .setValue(Direction.West)
                            .setDescription("Travel west")
                    )
            )
        )
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) => textDisplay
                .setContent(votesDisplayText || "Waiting for the party to choose a direction..."))
                .setButtonAccessory(button => button
                    .setCustomId("map")
                    .setLabel("See Local Map")
                    .setStyle(ButtonStyle.Primary)
                )
        );
    return container;
}
