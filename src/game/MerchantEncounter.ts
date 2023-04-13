import Character from "./Character";
import Encounter from "./Encounter";
import NonPlayerCharacter from "./NonPlayerCharacter";
import { CommandInteraction, SelectMenuInteraction } from "../types";
import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";

export default class MerchantEncounter extends Encounter {
    merchant: NonPlayerCharacter;

    commands = [
        {
            name: "buy",
            description: "Buy items from a merchant",
            execute: async (interaction: CommandInteraction) => {
                const merchant = this.getMerchant();
                const options = merchant.getCharacter().getInventory().getInteractionOptions();
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription("What do you want to buy?");
                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("item:buy")
                            .setPlaceholder("Nothing selected")
                            .addOptions(options)
                    );
                await interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                    components: [row]
                });
            }
        },
        {
            name: "sell",
            description: "Sell items to a merchant",
            execute: async (interaction: CommandInteraction, character: Character) => {
                const options = character.getInventory().getInteractionOptions();
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription("What do you want to sell?");
                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("item:sell")
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
    ];

    menus = [
        {
            name: "item:buy",
            execute: async (interaction: SelectMenuInteraction) => {
                await interaction.update({
                    content: "You offer to pay gold for the merchant's goods. "
                        + "Unfortunately, he's out of stock!"
                });
            }
        },
        {
            name: "item:sell",
            execute: async (interaction: SelectMenuInteraction) => {
                await interaction.update({
                    content: "You offer to sell the merchant some of your "
                        + "loot. Unfortunately, he's out of gold!"
                });
            }
        }
    ];

    constructor(characters: Character[], merchant: NonPlayerCharacter) {
        super(characters);
        this.merchant = merchant;
        console.info(
            "Merchant encounter started...",
            this.getCharacterNames(), "vs", this.getMerchantName()
        );
    }

    getMerchant = () => this.merchant;

    getMerchantName = () => this.merchant.getName();
}
