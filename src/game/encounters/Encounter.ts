import { ButtonPressInteraction, CommandInteraction, SelectMenuInteraction } from "../../types";
import Command from "../actions/commands/Command";
import Selection from "../actions/selections/Selection";
import { ExecuteFunction } from "../actions/Action";
import Button from "../actions/buttons/Button";
import Character from "../creatures/Character";
import Narrator from "../Narrator";
import Item from "../things/Item";
import { EncounterType } from "../../constants";

export interface EncounterResults {
    success: boolean;
    xp: number;
    loot?: Item[];
}

export default class Encounter {
    characters: Character[];

    turnBased: boolean;

    narrator: Narrator;

    handlers: Record<string, ExecuteFunction> = {};

    commands: Record<string, Command> = {};

    buttons: Record<string, Button> = {};

    menus: Record<string, Selection> = {};

    // Strings for display purposes
    type: EncounterType = EncounterType.Unspecified;
    description = "In an encounter...";

    constructor(characters: Character[], narrator: Narrator, turnBased = false) {
        this.characters = characters;
        this.narrator = narrator;
        this.turnBased = turnBased;
    }

    getDescription = () => this.description;

    getCharacters = () => this.characters;

    getCharacterNames = () => this.characters.map(char => char.getName());

    getXpReward = () => 10;

    /**
     * Returns a boolean indicating whether or not the encounter is over
     * based on its state. Each encounter type will have its own checks
     * for determining this value.
     */
    isOver = () => true;

    /**
     * Certain encounter have a win/loss condition. Once an encounter is
     * over, this method checks the state to determine if it results in a
     * win or loss. Each encounter type will have its own conditions for
     * determining the result.
     */
    isSuccess = () => true;

    getResults = () => ({
        success: this.isSuccess(),
        xp: this.getXpReward()
    });

    getCommand = (commandName: string) => this.commands[commandName];

    assertAndGetCommand(commandName: string) {
        const command = this.getCommand(commandName);
        if (!command) {
            throw new Error(`Invalid command for ${this.constructor.name}: ${commandName}`);
        }
        return command;
    }

    getMenu = (customId: string) => this.menus[customId];

    assertAndGetMenu(customId: string) {
        const menu = this.getMenu(customId);
        if (!menu) {
            throw new Error(`Invalid menu for ${this.constructor.name}: ${customId}`);
        }
        return menu;
    }

    getButton = (customId: string) => this.buttons[customId];

    assertAndGetButton(customId: string) {
        const button = this.getButton(customId);
        if (!button) {
            throw new Error(`Invalid button for ${this.constructor.name}: ${customId}`);
        }
        return button;
    }

    async handleCommand(
        interaction: CommandInteraction,
        command: Command,
        character: Character,
    ) {
        await command.execute(interaction, character);
    }

    async handleButton(
        interaction: ButtonPressInteraction,
        button: Button,
        character: Character,
    ) {
        if (!button.execute) {
            throw new Error(`Button ${button.customId} has no execute function.`);
        }
        await button.execute(interaction, character);
    }

    async handleMenuSelect(interaction: SelectMenuInteraction, character: Character) {
        const menu = this.getMenu(interaction.customId);
        if (!menu) {
            throw new Error(`Invalid menu for ${this.constructor.name}: ${interaction.customId}`);
        }
        await menu.execute(interaction, character);
    }
}
