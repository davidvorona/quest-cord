import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name = "attack",
    Description = "Strike at an enemy!"
}

export default class AttackCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, false);
    }
}
