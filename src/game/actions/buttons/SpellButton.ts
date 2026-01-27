import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class SpellButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("spell", execute, false);
        this.button.setLabel("Spell").setStyle(ButtonStyle.Primary);
    }
}
