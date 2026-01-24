import { ButtonStyle } from "discord.js";
import Button from "./Button";
import { ButtonExecuteFunction } from "../Action";

export default class SellButton extends Button {
    constructor(execute: ButtonExecuteFunction) {
        super("sell", execute);
        this.button.setLabel("Sell").setStyle(ButtonStyle.Secondary);
    }
}
