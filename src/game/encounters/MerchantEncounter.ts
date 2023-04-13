import Character from "../creatures/Character";
import Encounter from "./Encounter";
import NonPlayerCharacter from "../NonPlayerCharacter";
import { CommandInteraction, SelectMenuInteraction } from "../../types";
import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import Narrator from "../Narrator";

export default class MerchantEncounter extends Encounter {
    merchant: NonPlayerCharacter;

    static commands = [
        {
            name: "buy",
            description: "Buy items from a merchant"
        },
        {
            name: "sell",
            description: "Sell items to a merchant"
        }
    ];

    commands = {
        buy: {
            execute: async (interaction: CommandInteraction) => {
                const options = this.getMerchant()
                    .getCharacter()
                    .getInventory()
                    .getInteractionOptions();
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
        sell: {
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
    };

    menus = [
        {
            customId: "item:buy",
            execute: async (interaction: SelectMenuInteraction) => {
                await interaction.update({
                    content: "You offer to pay gold for the merchant's goods. "
                        + "Unfortunately, he's out of stock!"
                });
            }
        },
        {
            customId: "item:sell",
            execute: async (interaction: SelectMenuInteraction) => {
                await interaction.update({
                    content: "You offer to sell the merchant some of your "
                        + "loot. Unfortunately, he's out of gold!"
                });
            }
        }
    ];

    constructor(characters: Character[], narrator: Narrator, merchant: NonPlayerCharacter) {
        super(characters, narrator);
        this.merchant = merchant;
        console.info(
            "Merchant encounter started...",
            this.getCharacterNames(), "vs", this.getMerchantName()
        );
    }

    getMerchant = () => this.merchant;

    getMerchantName = () => this.merchant.getName();
}
