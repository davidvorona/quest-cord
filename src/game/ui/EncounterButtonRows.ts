import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import Button from "../actions/buttons/Button";

export default function EncounterButtonRows(buttons: Record<string, Button>) {
    const row0 = new ActionRowBuilder<ButtonBuilder>();
    const row1 = new ActionRowBuilder<ButtonBuilder>();
    for (const action in buttons) {
        const button = buttons[action];
        if (button.row === 0) {
            row0.addComponents(button.getButton());
        } else {
            row1.addComponents(button.getButton());
        }
    }
    return [row0, row1];
}
