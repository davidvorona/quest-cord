import {
    ButtonStyle,
    ContainerBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import { DungeonVote } from "../../constants";

export default function DungeonPrompt(votesDisplayText?: string) {
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) => textDisplay
            .setContent("# Enter dungeon? :skull:"))
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("enter-dungeon")
                    .setPlaceholder("Choose to enter or leave")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(DungeonVote.Enter)
                            .setValue(DungeonVote.Enter)
                            .setDescription("Enter the dungeon"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(DungeonVote.Leave)
                            .setValue(DungeonVote.Leave)
                            .setDescription("Leave the dungeon")
                    )
            )
        )
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) => textDisplay
                .setContent(votesDisplayText || "Waiting for the party to choose..."))
                .setButtonAccessory(button => button
                    .setCustomId("map")
                    .setLabel("See Local Map")
                    .setStyle(ButtonStyle.Primary)
                )
        );
    return container;
}
