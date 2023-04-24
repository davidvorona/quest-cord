import { BaseItem } from "../../types";

export default class Item {
    id: string;

    name: string;

    type: string;

    value: number;

    constructor(data: BaseItem) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.value = data.value;
    }
}
