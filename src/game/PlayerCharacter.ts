import { BaseCharacter } from "../types";
import { rand, loadNames } from "../util";
import Creature from "./Creature";

const { firstNames, lastNames } = loadNames();

export default class PlayerCharacter extends Creature {
    userId: string;

    firstName = firstNames[rand(firstNames.length)];

    lastName = lastNames[rand(lastNames.length)];

    constructor(data: BaseCharacter, userId: string) {
        super(data);
        this.userId = userId;
        console.info("Character", this.getName(),  "created");
    }

    getName = () => `${this.firstName} ${this.lastName}`;
}
