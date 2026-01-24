import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class LookoutButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("lookout", execute);
        this.button.setLabel("Lookout").setStyle(ButtonStyle.Primary);
    }
}
