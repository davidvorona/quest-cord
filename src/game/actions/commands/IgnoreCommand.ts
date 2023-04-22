import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name = "ignore",
    Description = "Keep to yourself and ignore the friendly figure"
}


export default class IgnoreCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, false);
    }
}
