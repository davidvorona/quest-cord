import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name = "buy",
    Description = "Buy items from a merchant"
}

export default class BuyCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, false);
    }
}
