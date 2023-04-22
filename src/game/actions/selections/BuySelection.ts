import { SelectionExecuteFunction } from "../Action";
import Selection from "./Selection";

export default class BuySelection extends Selection {
    constructor(execute: SelectionExecuteFunction) {
        super("buy", execute, false);
    }
}
