import Action, { CommandExecuteFunction } from "./Action";

export default abstract class Command extends Action {
    execute: CommandExecuteFunction;

    constructor(name: string, execute: CommandExecuteFunction, turnConsuming = false) {
        super(name, execute, turnConsuming);
        this.execute = execute;
    }
}
