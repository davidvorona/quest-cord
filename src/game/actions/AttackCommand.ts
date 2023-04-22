import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class AttackCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("attack", execute, false);
    }
}
