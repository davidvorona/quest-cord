import { CommandExecuteFunction } from "./Action";
import Command from "./Command";

export default class TalkCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super("talk", execute, false);
    }
}
