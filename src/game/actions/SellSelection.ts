import { SelectionExecuteFunction } from "./Action";
import Selection from "./Selection";

export default class SellSelection extends Selection {
    constructor(execute: SelectionExecuteFunction) {
        super("sell", execute, false);
    }
}
