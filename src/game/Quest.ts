import { createRandomId, isEmpty } from "../util";
import PlayerCharacter from "./PlayerCharacter";
import Encounter from "./encounters/Encounter";
import Character from "./creatures/Character";
import Narrator from "./Narrator";
import { CommandInteraction, SelectMenuInteraction } from "../types";
import TurnBasedEncounter from "./encounters/TurnBasedEncounter";

export default class Quest {
    readonly id: string;

    readonly guildId: string;

    readonly narrator: Narrator;

    pcs: Record<string, PlayerCharacter | null> = {};

    coordinates: [number, number] = [0, 0];

    encounter?: Encounter;

    constructor(guildId: string, narrator: Narrator) {
        console.info("Accepting new quest...");
        this.id = createRandomId();
        this.guildId = guildId;
        this.narrator = narrator;
    }

    getNarrator() {
        return this.narrator;
    }

    addPlayer(userId: string) {
        this.pcs[userId] = null;
    }

    private getPlayerByUserId(userId: string) {
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

    doesCharacterExist(pc: PlayerCharacter | null): pc is PlayerCharacter {
        return (pc as PlayerCharacter) !== null;
    }

    assertAndGetPlayerCharacter(userId: string) {
        const playerCharacter = this.getPlayerByUserId(userId);
        if (!this.doesCharacterExist(playerCharacter)) {
            throw new Error("Player character does not exist!");
        }
        return playerCharacter;
    }

    isCharacterCreated(userId: string) {
        return !isEmpty(this.pcs[userId]);
    }

    isCharacterInParty(pc: PlayerCharacter) {
        return this.pcs[pc.userId];
    }

    areAllCharactersCreated() {
        return Object.values(this.pcs).every(pc => !isEmpty(pc));
    }

    getCharacters() {
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

    getEncounter() {
        return this.encounter;
    }

    isInEncounter(): this is { encounter: Encounter } {
        return this.encounter !== undefined;
    }

    assertEncounterStarted() {
        if (!this.isInEncounter()) {
            throw new Error("Encounter is not started, aborting");
        }
    }

    assertAndGetEncounter() {
        if (!this.isInEncounter()) {
            throw new Error("Encounter is not started, aborting");
        }
        return this.encounter;
    }

    async startEncounter(encounter: Encounter) {
        this.encounter = encounter;

        // Narrate the encounter
        await this.narrator.describeEncounter(encounter);
        await this.narrator.explainEncounter(encounter);

        // If it's a turn-based encounter, then prompt for or handle the first turn
        if (encounter instanceof TurnBasedEncounter) {
            await encounter.handleTurn();
        }
    }

    async endEncounter() {
        const encounter = this.assertAndGetEncounter();
        await this.narrator.describeEncounterOver(encounter);

        const results = encounter.isSuccess();
        this.encounter = undefined;
        return results;
    }

    private validatePlayerTurn(userId: string) {
        if (!this.isUserInParty(userId)) {
            throw new Error("You are not on this quest. Destiny will call on you soon enough...");
        }
        if (
            !this.isInEncounter()
            || !(this.encounter instanceof TurnBasedEncounter)
        ) {
            throw new Error("You are not currently in a turn-based encounter.");
        }

        const currentTurn = this.encounter.getCurrentTurn();
        const myPlayerCharacter = this.assertAndGetPlayerCharacter(userId);
        if (currentTurn !== myPlayerCharacter.getCharacter()) {
            throw new Error("It's not your turn!");
        }
    }

    async handleEncounterCommand(interaction: CommandInteraction, commandNameOverride?: string) {
        if (!this.isInEncounter()) {
            throw new Error("There is no active encounter!");
        }
        const userId = interaction.user.id;
        const playerCharacter = this.assertAndGetPlayerCharacter(userId);
        const commandName = commandNameOverride || interaction.options.getSubcommand();
        const command = this.encounter.getCommand(commandName);
        const consumesTurn = command && command.consumesTurn;
        if (this.encounter instanceof TurnBasedEncounter && consumesTurn) {
            this.validatePlayerTurn(userId);
        }

        await this.encounter.handleCommand(
            interaction,
            playerCharacter.getCharacter(),
            commandNameOverride
        );

        if (this.encounter.isOver()) {
            const results = await this.endEncounter();
            return results;
        }

        if (this.encounter instanceof TurnBasedEncounter && consumesTurn) {
            await this.encounter.handleNextTurn();
        }
    }

    async handleEncounterMenuSelect(interaction: SelectMenuInteraction) {
        if (!this.isInEncounter()) {
            throw new Error("There is no active encounter!");
        }
        const userId = interaction.user.id;
        const playerCharacter = this.assertAndGetPlayerCharacter(userId);
        const selection = this.encounter.getMenu(interaction.customId);
        const consumesTurn = selection && selection.consumesTurn;
        if (this.encounter instanceof TurnBasedEncounter && consumesTurn) {
            this.validatePlayerTurn(userId);
        }

        await this.encounter.handleMenuSelect(interaction, playerCharacter.getCharacter());

        if (this.encounter.isOver()) {
            const results = await this.endEncounter();
            return results;
        }

        if (this.encounter instanceof TurnBasedEncounter && consumesTurn) {
            await this.encounter.handleNextTurn();
        }
    }
}
