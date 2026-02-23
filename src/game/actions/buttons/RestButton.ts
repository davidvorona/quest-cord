import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class RestButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("rest", execute);
        this.button.setLabel("Rest").setStyle(ButtonStyle.Primary);
    }
}
