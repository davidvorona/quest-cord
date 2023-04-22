import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class IgnoreCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("ignore", execute, false);
    }
}
