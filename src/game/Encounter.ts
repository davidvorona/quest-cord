import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { CommandInteraction, SelectMenuInteraction } from "../types";
import Character from "./Character";
import Narrator from "./Narrator";

interface StaticCommand {
    name: string;
    description: string;
}

interface EncounterCommand {
    execute: (interaction: CommandInteraction, character: Character) => Promise<void>;
    consumesTurn?: boolean;
}

interface EncounterSelection {
    customId: string;
    execute: (interaction: SelectMenuInteraction, character: Character) => Promise<void>;
    consumesTurn?: boolean;
}

export default class Encounter {
    characters: Character[];

    turnBased: boolean;

    narrator: Narrator;

    static commands: StaticCommand[] = [
        {
            name: "use",
            description: "Use an item from your inventory"
        }
    ];

    commands: Record<string, EncounterCommand> = {
        use: {
            execute: async (interaction: CommandInteraction, character: Character) => {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription("Which item are you using?");
                const options = character.getInventory().getInteractionOptions();
                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("item:use")
                            .setPlaceholder("Nothing selected")
                            .addOptions(options)
                    );
                await interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                    components: [row]
                });
            }
        }
    };

    menus: EncounterSelection[] = [
        {
            customId: "item:use",
            consumesTurn: true,
            execute: async (interaction: SelectMenuInteraction, character: Character) => {
                const item = interaction.values[0];
                try {
                    character.useItem(item);
                } catch (err) {
                    await interaction.reply({
                        content: "You do not have this item!",
                        ephemeral: true
                    });
                    return;
                }
                await this.narrator.ponderAndUpdate(interaction, {
                    content: `You use the ${item}.`,
                    components: [],
                    embeds: []
                });
            }
        }
    ];

    constructor(characters: Character[], narrator: Narrator, turnBased = false) {
        this.characters = characters;
        this.narrator = narrator;
        this.turnBased = turnBased;
    }

    getCharacters = () => this.characters;

    getCharacterNames = () => this.characters.map(char => char.getName());

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

    getCommand = (commandName: string) => this.commands[commandName];

    getMenu = (customId: string) => this.menus.find(s => s.customId === customId);

    async handleCommand(interaction: CommandInteraction, character: Character) {
        const command = this.getCommand(interaction.commandName);
        if (!command) {
            throw new Error(`Invalid command: ${interaction.commandName}`);
        }
        await command.execute(interaction, character);
    }

    async handleMenuSelect(interaction: SelectMenuInteraction, character: Character) {
        const menu = this.getMenu(interaction.customId);
        if (!menu) {
            throw new Error(`Invalid menu: ${interaction.customId}`);
        }
        await menu.execute(interaction, character);
    }
}
