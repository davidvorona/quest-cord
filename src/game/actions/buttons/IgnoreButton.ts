import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class IgnoreButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("ignore", execute);
        this.button.setLabel("Ignore").setStyle(ButtonStyle.Secondary);
    }
}
