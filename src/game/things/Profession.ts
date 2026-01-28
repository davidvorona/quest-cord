import { BaseProfession } from "../../types";

export default class Profession {
    id: string;

    name: string;

    description: string;

    constructor(data: BaseProfession) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
    }
}
