import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class BuyCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("buy", execute, false);
    }
}
