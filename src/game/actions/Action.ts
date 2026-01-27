import { SelectMenuInteraction, CommandInteraction, ButtonPressInteraction } from "../../types";
import Character from "../creatures/Character";

export interface CommandExecuteFunction {
    (interaction: CommandInteraction, character: Character): Promise<void>;
}

export interface SelectionExecuteFunction {
    (interaction: SelectMenuInteraction, character: Character): Promise<void>;
}

export interface ButtonExecuteFunction {
    (interaction: ButtonPressInteraction, character: Character): Promise<void>;
}

export type ExecuteFunction = CommandExecuteFunction
    | SelectionExecuteFunction | ButtonExecuteFunction;

export default abstract class Action {
    /* Name of the action, corresponding to a Discord command. */
    name: string;

    /* Code that is executed when this action is used. */
    execute: ExecuteFunction;

    // Whether or not the action is turn-consuming, this can be
    // overridden depending on the context.
    turnConsuming: boolean;

    constructor(name: string, execute: ExecuteFunction, turnConsuming = false) {
        this.name = name;
        this.turnConsuming = turnConsuming;
        this.execute = execute;
    }

    getName = () => this.name;

    isTurnConsuming = () => this.turnConsuming;

    setTurnConsuming(value: boolean) {
        this.turnConsuming = value;
    }
}
