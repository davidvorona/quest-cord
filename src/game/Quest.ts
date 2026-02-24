import { Message, Snowflake } from "discord.js";
import { createRandomId, isEmpty } from "../util";
import { Biome } from "../constants";
import PlayerCharacter, { LevelUp } from "./PlayerCharacter";
import Encounter from "./encounters/Encounter";
import Character from "./creatures/Character";
import Narrator from "./Narrator";
import Command from "./actions/commands/Command";
import Button from "./actions/buttons/Button";
import {
    ButtonPressInteraction,
    CommandInteraction,
    SelectMenuInteraction
} from "../types";
import TurnBasedEncounter from "./encounters/TurnBasedEncounter";
import PollBooth from "./polls/PollBooth";
import CharacterCreator from "../services/CharacterCreator";
import Profession from "./things/Profession";
import EncounterButtonRows from "./ui/EncounterButtonRows";
import FreeEncounter from "./encounters/FreeEncounter";

export default class Quest {
    readonly id: string;

    readonly guildId: string;

    readonly channelId: string;

    readonly narrator: Narrator;

    readonly pollBooth: PollBooth;

    characterCreators: Record<Snowflake, CharacterCreator> = {};

    pcs: Record<string, PlayerCharacter | null> = {};

    travelPromptRef?: Message<true>;
    route: [number, number][] = [];

    encounter?: Encounter;
    lastEncounter?: Encounter;

    constructor(guildId: string, channelId: string, userIds: string[], narrator: Narrator) {
        console.info("Accepting new quest...");
        this.id = createRandomId();
        this.guildId = guildId;
        this.channelId = channelId;
        this.pcs = this.initPlayers(userIds);
        this.narrator = narrator;
        this.pollBooth = new PollBooth(narrator, userIds);
    }

    initPlayers(userIds: string[]) {
        const players: Record<string, null> = {};
        userIds.forEach(id => (players[id] = null));
        return players;
    }

    getCharacterCreator(userId: Snowflake) {
        return this.characterCreators[userId];
    }

    setCharacterCreator(userId: Snowflake, creator: CharacterCreator) {
        this.characterCreators[userId] = creator;
    }

    getTravelPromptReference() {
        return this.travelPromptRef;
    }

    setTravelPromptReference(message: Message<true>) {
        this.travelPromptRef = message;
    }

    getNarrator() {
        return this.narrator;
    }

    getPollBooth() {
        return this.pollBooth;
    }

    getParty() {
        return this.pcs;
    }

    private getPlayerByUserId(userId: string) {
        return this.pcs[userId];
    }

    getPartyUserIds() {
        return Object.keys(this.pcs);
    }

    isUserInParty(userId: string) {
        return Object.prototype.hasOwnProperty.call(this.pcs, userId);
    }

    getPartySize() {
        return Object.keys(this.pcs).length;
    }

    getPlayerCharacters() {
        const pcs: PlayerCharacter[] = [];
        Object.values(this.pcs).forEach((pc) => {
            if (pc) pcs.push(pc);
        });
        return pcs;
    }

    createPlayerCharacter(
        userId: string,
        character: Character,
        lvlGains: LevelUp[],
        profession: Profession
    ) {
        const playerCharacter = new PlayerCharacter(userId, character, lvlGains, profession);
        this.pcs[userId] = playerCharacter;
        return playerCharacter;
    }

    doesCharacterExist(pc: PlayerCharacter | null): pc is PlayerCharacter {
        return (pc as PlayerCharacter) !== null;
    }

    assertPlayerCharacterExists(userId: string) {
        const playerCharacter = this.getPlayerByUserId(userId);
        if (!this.doesCharacterExist(playerCharacter)) {
            throw new Error("Player character does not exist!");
        }
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

    getRoute() {
        return this.route;
    }

    setPartyCoordinates(coordinates: [number, number]) {
        this.route.push(coordinates);
    }

    getPartyCoordinates() {
        return this.route[this.route.length - 1] || [0, 0];
    }

    getPartyLastCoordinates() {
        return this.route[this.route.length - 2] || [0, 0];
    }

    getEncounter() {
        return this.encounter;
    }

    getLastEncounter() {
        return this.lastEncounter;
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

    async startEncounter(encounter: Encounter, biome: Biome) {
        this.encounter = encounter;

        await this.narrator.describeEncounter(encounter, biome);

        // If it's a turn-based encounter, then prompt for or handle the first turn
        if (encounter instanceof TurnBasedEncounter) {
            await encounter.handleTurn();
        }

        await this.narrator.describe({ components: EncounterButtonRows(encounter.buttons) });

        // Prompt the party to travel if it's a free encounter
        if (encounter instanceof FreeEncounter) {
            await this.narrator.promptFreeTravel();
        }
    }

    async endEncounter() {
        const encounter = this.assertAndGetEncounter();
        await this.narrator.describeEncounterOver(encounter);

        this.lastEncounter = encounter;
        this.encounter = undefined;
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
        if (currentTurn !== myPlayerCharacter.getCharId()) {
            throw new Error("It's not your turn!");
        }
    }

    validateEncounterInteraction(
        interaction: CommandInteraction | ButtonPressInteraction,
        commandNameOverride?: string
    ) {
        if (!this.isInEncounter()) {
            throw new Error("There is no active encounter!");
        }
        // Assert interaction user has a valid player character
        this.assertPlayerCharacterExists(interaction.user.id);
        // Validate the interaction itself
        let action;
        if (interaction.isCommand()) {
            action = this.encounter
                .assertAndGetCommand(commandNameOverride || interaction.options.getSubcommand());
        } else {
            action = this.encounter.assertAndGetButton(interaction.customId);
        }
        // If turn-based, validate the player's turn
        if (
            this.encounter instanceof TurnBasedEncounter
            && this.encounter.isActionTurnConsuming(action)
        ) {
            this.validatePlayerTurn(interaction.user.id);
        }
        return action;
    }

    async handleEncounterInteraction(
        interaction: CommandInteraction | ButtonPressInteraction,
        action: Command | Button
    ) {
        if (!this.isInEncounter()) {
            throw new Error("There is no active encounter!");
        }
        const playerCharacter = this.assertAndGetPlayerCharacter(interaction.user.id);

        if (interaction.isCommand()) {
            await this.encounter.handleCommand(
                interaction,
                action as Command,
                playerCharacter.getCharacter()
            );
        } else if (interaction.isButton()) {
            await this.encounter.handleButton(
                interaction,
                action as Button,
                playerCharacter.getCharacter()
            );
        }

        if (this.encounter.isOver()) {
            const results = this.encounter.getResults();
            return results;
        }

        if (
            this.encounter instanceof TurnBasedEncounter
            && this.encounter.isActionTurnConsuming(action)
        ) {
            await this.encounter.handleNextTurn();
            if (this.encounter.isOver()) {
                const results = this.encounter.getResults();
                return results;
            } else {
                const buttons = EncounterButtonRows(this.encounter.buttons);
                await this.narrator.describe({ components: buttons });
            }
        }
    }

    async handleEncounterMenuSelect(interaction: SelectMenuInteraction) {
        if (!this.isInEncounter()) {
            throw new Error("There is no active encounter!");
        }
        const userId = interaction.user.id;
        const playerCharacter = this.assertAndGetPlayerCharacter(userId);
        const selection = this.encounter.assertAndGetMenu(interaction.customId);
        if (
            this.encounter instanceof TurnBasedEncounter
            && this.encounter.isActionTurnConsuming(selection)
        ) {
            this.validatePlayerTurn(userId);
        }

        await this.encounter.handleMenuSelect(interaction, playerCharacter.getCharacter());

        if (this.encounter.isOver()) {
            const results = this.encounter.getResults();
            return results;
        }

        if (
            this.encounter instanceof TurnBasedEncounter
            && this.encounter.isActionTurnConsuming(selection)
        ) {
            await this.encounter.handleNextTurn();
            if (this.encounter.isOver()) {
                const results = this.encounter.getResults();
                return results;
            } else {
                const buttons = EncounterButtonRows(this.encounter.buttons);
                await this.narrator.describe({ components: buttons });
            }
        }
    }
}
