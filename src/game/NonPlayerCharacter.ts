
import { rand, loadNames } from "../util";
import Character from "./Character";

const { firstNames, lastNames } = loadNames();

export default class NonPlayerCharacter {
    readonly character: Character;

    readonly firstName: string;

    readonly lastName: string;

    constructor(character: Character) {
        this.character = character;

        this.firstName = firstNames[rand(firstNames.length)];
        this.lastName = lastNames[rand(lastNames.length)];
    }

    getName() {
        return `${this.firstName} ${this.lastName}`;
    }

    getCharacter() {
        return this.character;
    }
}
