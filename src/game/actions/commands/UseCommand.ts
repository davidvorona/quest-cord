import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name =  "use",
    Description = "Use an item from your inventory",
    // We don't want to register '/action use' because 'use' is
    // already a top-level command
    Hidden = 1
}

export default class UseCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, false);
    }
}
