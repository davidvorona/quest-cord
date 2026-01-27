import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class AttackButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("attack", execute, false);
        this.button.setLabel("Attack").setStyle(ButtonStyle.Danger);
    }
}
