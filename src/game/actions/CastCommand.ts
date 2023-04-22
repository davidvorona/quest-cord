import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class CastCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("cast", execute, false);
    }
}
