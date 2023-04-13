import { CommandInteraction, SelectMenuInteraction } from "../types";
import Character from "./Character";

interface EncounterCommand {
    name: string;
    description: string;
    execute: (interaction: CommandInteraction, character: Character) => Promise<void>
}

interface EncounterSelection {
    name: string;
    execute: (interaction: SelectMenuInteraction, character: Character) => Promise<void>
}

export default class Encounter {
    characters: Character[];

    turnBased: boolean;

    commands: EncounterCommand[] = [];

    menus: EncounterSelection[] = [];

    constructor(characters: Character[], turnBased = false) {
        this.characters = characters;
        this.turnBased = turnBased;
    }

    getCharacters = () => this.characters;

    getCharacterNames = () => this.characters.map(char => char.getName());

    // TODO: Implement actual win conditions for each encounter type
    isOver = () => true;

    isSuccess = () => true;

    async handleCommand(interaction: CommandInteraction, character: Character) {
        const command = this.commands.find(c => c.name === interaction.commandName);
        if (!command) {
            throw new Error(`Invalid command: ${interaction.commandName}`);
        }
        await command.execute(interaction, character);
    }

    async handleMenuSelect(interaction: SelectMenuInteraction, character: Character) {
        const menu = this.menus.find(s => s.name === interaction.customId);
        if (!menu) {
            throw new Error(`Invalid menu: ${interaction.customId}`);
        }
        await menu.execute(interaction, character);
    }
}
