import Character from "./Character";

export default class Encounter {
    characters: Character[];

    turnBased: boolean;

    constructor(characters: Character[], turnBased = false) {
        this.characters = characters;
        this.turnBased = turnBased;
    }

    getCharacters = () => this.characters;

    getCharacterNames = () => this.characters.map(char => char.getName());

    // TODO: Implement actual win conditions for each encounter type
    isOver = () => true;

    isSuccess = () => true;
}
