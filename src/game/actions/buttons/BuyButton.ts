import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class BuyButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("buy", execute);
        this.button.setLabel("Buy").setStyle(ButtonStyle.Primary);
    }
}
