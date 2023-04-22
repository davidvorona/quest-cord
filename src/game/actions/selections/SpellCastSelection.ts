import { SelectionExecuteFunction } from "../Action";
import Selection from "./Selection";

export default class SpellCastSelection extends Selection {
    constructor(execute: SelectionExecuteFunction) {
        super("spell:cast", execute, false);
    }
}
