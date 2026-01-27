import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class SurpriseButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("surprise", execute);
        this.button.setLabel("Surprise").setStyle(ButtonStyle.Danger);
    }
}
