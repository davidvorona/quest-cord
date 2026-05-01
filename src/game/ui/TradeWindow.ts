import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
} from "discord.js";
import TradeService from "../../services/TradeService";

export default function TradeWindow(tradeService: TradeService) {
    const [requester, recipient] = tradeService.traders;

    const components = [];
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("# Trade Window"))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`### ${requester.getName()}`),
            (textDisplay) => textDisplay.setContent("*No items on offer*"))
                .setButtonAccessory((button) =>
                    button
                        .setCustomId(`recipient:add:${requester.userId}`)
                        .setLabel("Add Item")
                        .setStyle(ButtonStyle.Primary)))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`### ${recipient.getName()}`),
            (textDisplay) => textDisplay.setContent("*No items on offer*"))
                .setButtonAccessory((button) =>
                    button
                        .setCustomId(`requester:add:${recipient.userId}`)
                        .setLabel("Add Item")
                        .setStyle(ButtonStyle.Primary)));
    components.push(container);
    if (tradeService.atLeastOneItemOffered()) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("trade:accept")
                .setLabel("Accept")
                .setStyle(ButtonStyle.Success),
        );
        components.push(row);
    }
    return components;
}
