import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name =  "sneak",
    Description = "Try to sneak past the enemies"
}

export default class SneakCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, false);
    }
}
