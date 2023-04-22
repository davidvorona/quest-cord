import Action, { SelectionExecuteFunction } from "./Action";

export default abstract class Selection extends Action {
    customId: string;

    execute: SelectionExecuteFunction;

    constructor(name: string, execute: SelectionExecuteFunction, turnConsuming = false) {
        super(name, execute, turnConsuming);
        this.customId = name;
        this.execute = execute;
    }
}
