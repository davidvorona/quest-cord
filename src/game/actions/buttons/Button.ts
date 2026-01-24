import { ButtonBuilder } from "discord.js";
import Action, { ButtonExecuteFunction } from "../Action";


type ButtonRow = 0 | 1;

export default class Button extends Action {
    customId: string;

    row: ButtonRow = 0;

    button: ButtonBuilder;

    execute: ButtonExecuteFunction;

    constructor(customId: string, execute: ButtonExecuteFunction, turnConsuming = false) {
        super(customId, execute, turnConsuming);
        this.customId = customId;
        this.button = new ButtonBuilder().setCustomId(customId);
        this.execute = execute;
    }

    getButton() {
        return this.button;
    }
}
