import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class SneakButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("sneak", execute);
        this.button.setLabel("Sneak").setStyle(ButtonStyle.Primary);
    }
}
