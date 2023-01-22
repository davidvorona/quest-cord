import { rand, loadNames } from "../util";
import Character from "./Character";

const { firstNames, lastNames } = loadNames();

export default class PlayerCharacter {
    readonly character: Character;

    readonly userId: string;

    readonly firstName: string;

    readonly lastName: string;

    lvl: number;

    constructor(userId: string, character: Character) {
        this.userId = userId;
        this.character = character;

        this.firstName = firstNames[rand(firstNames.length)];
        this.lastName = lastNames[rand(lastNames.length)];
        // Set the name of the base character to the PC name
        this.character.setName(this.getName());

        this.lvl = 1;

        console.info("Character", this.getName(),  "created");
    }

    getName() {
        return `${this.firstName} ${this.lastName}`;
    }

    getCharacter() {
        return this.character;
    }
}
