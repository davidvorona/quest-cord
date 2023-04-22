import { SelectionExecuteFunction } from "./Action";
import Selection from "./Selection";

export default class SpellTargetSelection extends Selection {
    constructor(execute: SelectionExecuteFunction) {
        super("spell:target", execute, true);
    }
}
