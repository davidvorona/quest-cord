import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class SurpriseCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("surprise", execute, false);
    }
}
