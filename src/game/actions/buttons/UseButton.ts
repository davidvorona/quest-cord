import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class UseButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("use", execute, false);
        this.button.setLabel("Use Item").setStyle(ButtonStyle.Success);
    }
}
