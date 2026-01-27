import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class MoveButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("move", execute, false);
        this.button.setLabel("Move").setStyle(ButtonStyle.Secondary);
    }
}
