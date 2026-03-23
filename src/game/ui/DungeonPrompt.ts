import {
    ButtonStyle,
    ContainerBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import { DungeonVote } from "../../constants";
import Dungeon from "../Dungeon";
import World from "../World";

export default function DungeonPrompt(dungeon: Dungeon, votesDisplayText?: string) {
    const formattedDungeonType = dungeon.type.charAt(0).toUpperCase() + dungeon.type.slice(1);
    const formattedSize = Dungeon.getSizeText(dungeon.size);
    const { emoji } = World.getDungeonData(dungeon.type);
    const emojiDisplay = /\p{Extended_Pictographic}/u.test(emoji)
        ? emoji
        : `<:${dungeon.type}:${emoji}>`;
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) => textDisplay
            .setContent("# Enter dungeon? :skull:"))
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) => textDisplay
            .setContent(`Type: ${emojiDisplay} **${formattedDungeonType}**`),
        textDisplay => textDisplay.setContent(`Length: **${formattedSize}**`),
        textDisplay => textDisplay.setContent("*Dungeons are full of dangerous monsters and traps. "
            + "Encounters will be more challenging, but the rewards are greater...*"))
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("enter-dungeon")
                    .setPlaceholder("Choose to enter or move on")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(DungeonVote.Enter)
                            .setValue(DungeonVote.Enter)
                            .setDescription("Enter the dungeon"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(DungeonVote.Leave)
                            .setValue(DungeonVote.Leave)
                            .setDescription("Continue traveling")
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
