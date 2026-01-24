import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class SkipButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("skip", execute, true);
        this.button.setLabel("Skip Turn").setStyle(ButtonStyle.Danger);
        this.row = 1;
    }
}
