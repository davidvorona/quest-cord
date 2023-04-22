import { SelectionExecuteFunction } from "./Action";
import Selection from "./Selection";

export default class AttackSelection extends Selection {
    constructor(execute: SelectionExecuteFunction) {
        super("attack", execute, true);
    }
}
