import { Snowflake } from "discord.js";
import PlayerCharacter from "../game/PlayerCharacter";

export default class TradeService {
    traders: [PlayerCharacter, PlayerCharacter];

    items: [Record<string, number>, Record<string, number>] = [{}, {}];

    tradeAccepted: boolean[] = [false, false];

    tradeConfirmed: boolean[] = [false, false];

    constructor(requester: PlayerCharacter, recipient: PlayerCharacter) {
        this.traders = [requester, recipient];
    }

    public addItem(userId: Snowflake, itemId: string, quantity = 1) {
        if (this.tradeAccepted.every(accepted => accepted)) {
            throw new Error("Cannot add items after both parties have accepted the trade.");
        }
        const traderIdx = this.traders.findIndex(trader => trader.userId === userId);
        if (traderIdx === -1) {
            throw new Error("User is not part of this trade.");
        }

        const traderItems = this.items[traderIdx];
        traderItems[itemId] = (traderItems[itemId] || 0) + quantity;
    }

    public removeItem(userId: Snowflake, itemId: string, quantity = 1) {
        const traderIdx = this.traders.findIndex(trader => trader.userId === userId);
        if (traderIdx === -1) {
            throw new Error("User is not part of this trade.");
        }

        const traderItems = this.items[traderIdx];
        if (!traderItems[itemId] || traderItems[itemId] < quantity) {
            throw new Error("Not enough items to remove.");
        }

        traderItems[itemId] -= quantity;
        if (traderItems[itemId] === 0) {
            delete traderItems[itemId];
        }
    }

    public acceptTrade(userId: Snowflake) {
        const traderIdx = this.traders.findIndex(trader => trader.userId === userId);
        if (traderIdx === -1) {
            throw new Error("User is not part of this trade.");
        }

        this.tradeAccepted[traderIdx] = true;
    }

    public confirmTrade(userId: Snowflake) {
        if (!this.tradeAccepted.every(accepted => accepted)) {
            throw new Error("Both parties must accept the trade before confirming.");
        }

        const traderIdx = this.traders.findIndex(trader => trader.userId === userId);
        if (traderIdx === -1) {
            throw new Error("User is not part of this trade.");
        }

        this.tradeConfirmed[traderIdx] = true;
    }

    public atLeastOneItemOffered() {
        return this.items.some(traderItems => Object.keys(traderItems).length > 0);
    }
}
