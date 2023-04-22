import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class SellCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("sell", execute, false);
    }
}
