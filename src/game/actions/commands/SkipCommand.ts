import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name = "skip",
    Description = "Skip your turn in combat"
}

export default class SkipCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, true);
    }
}
