import { SelectionExecuteFunction } from "../Action";
import Selection from "./Selection";

export default class UseSelection extends Selection {
    constructor(execute: SelectionExecuteFunction) {
        super("use", execute, true);
    }
}
