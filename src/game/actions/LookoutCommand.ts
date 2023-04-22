import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class LookoutCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("lookout", execute, false);
    }
}
