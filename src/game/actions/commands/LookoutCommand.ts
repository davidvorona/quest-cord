import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name = "lookout",
    Description = "Take in your surroundings from a vantage point"
}

export default class LookoutCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, false);
    }
}
