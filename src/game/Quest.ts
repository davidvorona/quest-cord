import { createRandomId, isEmpty } from "../util";
import PlayerCharacter from "./PlayerCharacter";
import Encounter from "./Encounter";
import Character from "./Character";
import Monster from "./Monster";

export default class Quest {
    id: string;

    guildId: string;

    pcs: Record<string, PlayerCharacter | null> = {};

    coordinates: [number, number] = [0, 0];

    encounter?: Encounter;

    constructor(guildId: string) {
        console.info("Accepting new quest...");
        this.id = createRandomId();
        this.guildId = guildId;
    }

    addPlayer(userId: string) {
        this.pcs[userId] = null;
    }

    getPlayerByUserId(userId: string) {
        return this.pcs[userId];
    }

    isUserInParty(userId: string) {
        return Object.prototype.hasOwnProperty.call(this.pcs, userId);
    }

    getPartySize() {
        return Object.keys(this.pcs).length;
    }

    createPlayerCharacter(userId: string, character: Character) {
        const playerCharacter = new PlayerCharacter(userId, character);
        this.pcs[userId] = playerCharacter;
        return playerCharacter;
    }

    isCharacterCreated(userId: string) {
        return !isEmpty(this.pcs[userId]);
    }

    areAllCharactersCreated() {
        return Object.values(this.pcs).every(pc => !isEmpty(pc));
    }

    getCharacters(): Character[] {
        const characters: Character[] = [];
        Object.values(this.pcs).forEach((pc) => {
            if (pc) characters.push(pc.getCharacter());
        });
        return characters;
    }

    setPartyCoordinates(coordinates: [number, number]) {
        this.coordinates = coordinates;
    }

    getPartyCoordinates() {
        return this.coordinates;
    }

    assertEncounterStarted() {
        if (isEmpty(this.encounter)) {
            throw new Error("Encounter is not started, aborting");
        }
    }

    startEncounter(monsters: Monster[]) {
        const characters = this.getCharacters();
        const encounter = new Encounter(characters, monsters);
        this.encounter = encounter;
    }

    getEncounter() {
        return this.encounter;
    }

    endEncounter() {
        this.encounter = undefined;
    }

    isInEncounter() {
        return this.encounter !== undefined;
    }
}
