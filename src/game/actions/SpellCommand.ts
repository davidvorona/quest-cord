import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class SpellCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("spell", execute, false);
    }
}
