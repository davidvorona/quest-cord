import {
    ButtonStyle,
    ContainerBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";

export default function TravelPrompt(votesDisplayText?: string) {
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) => textDisplay
            .setContent("# Where would you like to go? :person_walking_facing_right:"))
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("choose-direction")
                    .setPlaceholder("Choose a direction")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel("North")
                            .setValue("north")
                            .setDescription("Travel north"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("South")
                            .setValue("south")
                            .setDescription("Travel south"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("East")
                            .setValue("east")
                            .setDescription("Travel east"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("West")
                            .setValue("west")
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
