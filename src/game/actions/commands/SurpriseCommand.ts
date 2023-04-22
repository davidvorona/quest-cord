import { CommandExecuteFunction } from "../Action";
import Command from "./Command";

export enum CommandData {
    Name =  "surprise",
    Description = "Surprise the enemies and attack!"
}

export default class SurpriseCommand extends Command {
    constructor(execute: CommandExecuteFunction) {
        super(CommandData.Name, execute, false);
    }
}
