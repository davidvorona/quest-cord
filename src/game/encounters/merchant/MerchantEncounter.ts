import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import Character from "../../creatures/Character";
import FreeEncounter from "../FreeEncounter";
import NonPlayerCharacter from "../../NonPlayerCharacter";
import { CommandInteraction, SelectMenuInteraction } from "../../../types";
import { EncounterType } from "../../../constants";
import Narrator from "../../Narrator";
import {
    BuyCommand,
    SellCommand,
    BuySelection,
    SellSelection
} from "../../actions";
import Item from "../../things/Item";
import Inventory from "../../creatures/Inventory";

export default class MerchantEncounter extends FreeEncounter {
    type = EncounterType.Merchant;
    description = "Trading with a merchant! :coin:";

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
            const embed = this.doTransaction(character, merchantCharacter, itemIds);
            await this.narrator.update(interaction, {
                embeds: [embed],
                components: []
            });
        }),
        new SellSelection(async (interaction: SelectMenuInteraction, character: Character) => {
            const itemIds = interaction.values;
            const merchantCharacter = this.merchant.getCharacter();
            const embed = this.doTransaction(merchantCharacter, character, itemIds);
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

    doTransaction = (buyer: Character, seller: Character, itemIds: string[]) => {
        const inventory = seller.getInventory();
        const isPurchase = seller === this.merchant.getCharacter();
        let notInStock = false;
        const itemsToBuy: Item[] = [];
        let totalValue = 0;
        let description = "";
        itemIds.forEach((itemId) => {
            const itemToBuy = inventory.getItem(itemId);
            if (!itemToBuy) {
                notInStock = true;
            } else {
                itemsToBuy.push(itemToBuy);
                totalValue += itemToBuy.value;
            }
        });
        if (notInStock) {
            description = isPurchase
                ? "The merchant no longer has this in stock!"
                : "You don't have that item!";
        } else if (totalValue > buyer.getGp()) {
            description = isPurchase
                ? `This will cost **${totalValue}gp**, you have **${buyer.getGp()}gp**.`
                : "The merchant cannot afford this.";
        } else {
            inventory.removeItems(itemIds);
            buyer.gp -= totalValue;
            buyer.addToInventory(itemsToBuy);
            description = `You ${isPurchase ? "purchase" : "sell"} **${itemsToBuy.length}** `
                + `items for **${totalValue}gp**!`;
        }
        return new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(description)
            .addFields(...Inventory.getInteractionFields(itemsToBuy));
    };
}
