import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import Character from "../creatures/Character";
import FreeEncounter from "./FreeEncounter";
import NonPlayerCharacter from "../NonPlayerCharacter";
import { CommandInteraction, SelectMenuInteraction } from "../../types";
import Narrator from "../Narrator";
import {
    BuyCommand,
    SellCommand,
    BuySelection,
    SellSelection
} from "../actions";
import Item from "../things/Item";

export default class MerchantEncounter extends FreeEncounter {
    merchant: NonPlayerCharacter;

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
                        .setMinValues(1)
                        .setMaxValues(options.length)
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
                        .setMinValues(1)
                        .setMaxValues(options.length)
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
        new BuySelection(async (interaction: SelectMenuInteraction, character: Character) => {
            const itemIds = interaction.values;
            const merchantCharacter = this.merchant.getCharacter();
            const shop = merchantCharacter.getInventory();
            let notInStock = false;
            const itemsToBuy: Item[] = [];
            itemIds.forEach((itemId) => {
                const itemToBuy = shop.getItem(itemId);
                if (!itemToBuy) {
                    notInStock = true;
                } else {
                    itemsToBuy.push(itemToBuy);
                }
            });
            if (notInStock) {
                await this.narrator.update(interaction, {
                    content: "The merchant no longer has this in stock!"
                });
                return;
            }
            shop.removeItems(itemIds);
            character.addToInventory(itemsToBuy);
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription(`You purchase **${itemsToBuy.length}** items!`);
            await this.narrator.update(interaction, {
                embeds: [embed],
                components: []
            });
        }),
        new SellSelection(async (interaction: SelectMenuInteraction, character: Character) => {
            const itemIds = interaction.values;
            const inventory = character.getInventory();
            let notInInventory = false;
            const itemsToSell: Item[] = [];
            itemIds.forEach((itemId) => {
                const itemToSell = inventory.getItem(itemId);
                if (!itemToSell) {
                    notInInventory = true;
                } else {
                    itemsToSell.push(itemToSell);
                }
            });
            if (notInInventory) {
                await this.narrator.update(interaction, {
                    content: "You don't have that item!"
                });
                return;
            }
            inventory.removeItems(itemIds);
            const merchantCharacter = this.merchant.getCharacter();
            merchantCharacter.addToInventory(itemsToSell);
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription(`You sell **${itemsToSell.length}** items!`);
            await this.narrator.update(interaction, {
                embeds: [embed],
                components: []
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
