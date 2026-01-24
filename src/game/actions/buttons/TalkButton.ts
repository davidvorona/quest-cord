import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class TalkButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("talk", execute);
        this.button.setLabel("Talk").setStyle(ButtonStyle.Primary);
    }
}
