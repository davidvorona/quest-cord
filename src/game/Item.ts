import { BaseItem } from "../types";

export default class Item {
    id: string;

    name: string;

    type: string;

    constructor(data: BaseItem) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
    }
}
