import { ButtonBuilder } from "discord.js";
import { ButtonPressInteraction } from "../../types";

export interface ButtonExecuteFunction {
    (interaction: ButtonPressInteraction): Promise<void>;
}

export default class Button {
    button: ButtonBuilder;

    execute?: ButtonExecuteFunction;

    constructor(execute?: ButtonExecuteFunction) {
        this.button = new ButtonBuilder();
        this.execute = execute;
    }
}
