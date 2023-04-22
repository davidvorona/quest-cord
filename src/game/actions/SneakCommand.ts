import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class SneakCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("sneak", execute, false);
    }
}
