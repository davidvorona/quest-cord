import Character from "../creatures/Character";
import FreeEncounter from "./FreeEncounter";
import NonPlayerCharacter from "../NonPlayerCharacter";
import { CommandInteraction, SelectMenuInteraction } from "../../types";
import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import Narrator from "../Narrator";
import {
    BuyCommand,
    SellCommand,
    BuySelection,
    SellSelection
} from "../actions";

export default class MerchantEncounter extends FreeEncounter {
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
        buy: new BuyCommand(async (interaction: CommandInteraction) => {
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
                        .setCustomId("buy")
                        .setPlaceholder("Nothing selected")
                        .addOptions(options)
                );
            await this.narrator.reply(interaction, {
                ephemeral: true,
                embeds: [embed],
                components: [row]
            });
        }),
        sell: new SellCommand(async (interaction: CommandInteraction, character: Character) => {
            const options = character.getInventory().getInteractionOptions();
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription("What do you want to sell?");
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("sell")
                        .setPlaceholder("Nothing selected")
                        .addOptions(options)
                );
            await this.narrator.reply(interaction, {
                ephemeral: true,
                embeds: [embed],
                components: [row]
            });
        })
    };

    menus = [
        new BuySelection(async (interaction: SelectMenuInteraction) => {
            await this.narrator.update(interaction, {
                content: "You offer to pay gold for the merchant's goods. "
                    + "Unfortunately, he's out of stock!"
            });
        }),
        new SellSelection(async (interaction: SelectMenuInteraction) => {
            await this.narrator.update(interaction, {
                content: "You offer to sell the merchant some of your "
                    + "loot. Unfortunately, he's out of gold!"
            });
        })
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
