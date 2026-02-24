import {
    MessageFlags,
    StringSelectMenuBuilder
} from "discord.js";
import Character from "../../creatures/Character";
import FreeEncounter from "../FreeEncounter";
import NonPlayerCharacter from "../../NonPlayerCharacter";
import { ButtonPressInteraction, CommandInteraction, SelectMenuInteraction } from "../../../types";
import { EncounterType } from "../../../constants";
import Narrator from "../../Narrator";
import {
    BuyCommand,
    SellCommand,
    BuySelection,
    SellSelection,
    BuyButton,
    SellButton
} from "../../actions";
import Item from "../../things/Item";
import InventoryDisplay, { ShopInventoryDisplay } from "../../ui/InventoryDisplay";

export default class MerchantEncounter extends FreeEncounter {
    type = EncounterType.Merchant;
    description = "Trading with a merchant! :coin:";

    merchant: NonPlayerCharacter;

    getBuySelectMenu = () => {
        const options = this.getMerchant()
            .getCharacter()
            .getInventory()
            .getInteractionOptions();
        return new StringSelectMenuBuilder()
            .setCustomId("buy")
            .setPlaceholder("Select item to buy")
            .setMinValues(1)
            .setMaxValues(options.length)
            .addOptions(options);
    };

    getSellSelectMenu = (character: Character) => {
        const options = character.getInventory().getInteractionOptions();
        return new StringSelectMenuBuilder()
            .setCustomId("sell")
            .setPlaceholder("Select item to sell")
            .setMinValues(1)
            .setMaxValues(options.length)
            .addOptions(options);
    };

    handlePlayerBuy = async (
        interaction: CommandInteraction | ButtonPressInteraction,
        character: Character
    ) => {
        const inventoryDisplay = ShopInventoryDisplay(this.getMerchant());
        const buySelectMenu = this.getBuySelectMenu();
        inventoryDisplay.addSeparatorComponents(separator => separator)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`You have :coin: ${character.getGp()} gold`))
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(buySelectMenu));
        await this.narrator.reply(interaction, {
            components: [inventoryDisplay],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    };

    handlePlayerSell = async (
        interaction: CommandInteraction | ButtonPressInteraction,
        character: Character
    ) => {
        const inventoryDisplay = InventoryDisplay(character);
        const sellSelectMenu = this.getSellSelectMenu(character);
        inventoryDisplay.addSeparatorComponents(separator => separator)
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(sellSelectMenu));
        await this.narrator.reply(interaction, {
            components: [inventoryDisplay],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    };

    handlePlayerBuySelection = async (interaction: SelectMenuInteraction, character: Character) => {
        const itemIds = interaction.values;
        const merchantCharacter = this.merchant.getCharacter();
        const resultStr = this.doTransaction(character, merchantCharacter, itemIds);

        const inventoryDisplay = ShopInventoryDisplay(this.getMerchant());
        const buySelectMenu = this.getBuySelectMenu();
        inventoryDisplay.addSeparatorComponents(separator => separator)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`You have :coin: ${character.getGp()} gold`))
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(buySelectMenu))
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(resultStr));
        await this.narrator.update(interaction, {
            components: [inventoryDisplay],
            flags: MessageFlags.IsComponentsV2
        });
    };

    handlePlayerSellSelection = async (
        interaction: SelectMenuInteraction,
        character: Character
    ) => {
        const itemIds = interaction.values;
        const merchantCharacter = this.merchant.getCharacter();
        const resultStr = this.doTransaction(merchantCharacter, character, itemIds);

        const inventoryDisplay = InventoryDisplay(character);
        const sellSelectMenu = this.getSellSelectMenu(character);
        inventoryDisplay.addSeparatorComponents(separator => separator)
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(sellSelectMenu))
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(resultStr));
        await this.narrator.update(interaction, {
            components: [inventoryDisplay],
            flags: MessageFlags.IsComponentsV2
        });
    };

    commands = {
        buy: new BuyCommand(this.handlePlayerBuy),
        sell: new SellCommand(this.handlePlayerSell)
    };

    menus = {
        buy: new BuySelection(this.handlePlayerBuySelection),
        sell: new SellSelection(this.handlePlayerSellSelection)
    };

    buttons = {
        buy: new BuyButton(this.handlePlayerBuy),
        sell: new SellButton(this.handlePlayerSell)
    };

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
            seller.gp += totalValue;
            buyer.gp -= totalValue;
            buyer.addToInventory(itemsToBuy);
            description = `You ${isPurchase ? "purchase" : "sell"} **${itemsToBuy.length}** `
                + `items for **${totalValue}gp**!`;
        }
        return description;
    };
}
