import { ButtonBuilder, ButtonStyle } from "discord.js";
import Button from "./Button";

export default class QuestButton extends Button {
    button: ButtonBuilder;

    constructor() {
        super();
        this.button = new ButtonBuilder()
            .setCustomId("quest")
            .setLabel("See Quest")
            .setStyle(ButtonStyle.Primary);
    }
}
