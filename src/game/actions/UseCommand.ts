import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class UseCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("use", execute, false);
    }
}
