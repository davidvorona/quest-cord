import Item from "../things/Item";

export default class Inventory {
    items: Item[];

    static MAX_SIZE = 25;

    constructor(items: Item[]) {
        this.items = items;
    }

    getItems = () => this.items;

    hasItem = (id: string) => this.items.findIndex(i => i.id === id) > -1;

    getItem = (id: string) => this.items.find(i => i.id === id);

    getItemQuantity = (id: string) => this.items.filter(i => i.id === id).length;

    removeItem = (id: string) => {
        const removeIndex = this.items.findIndex(i => i.id === id);
        this.items.splice(removeIndex, 1);
    };

    removeItems = (itemIds: string[]) => {
        itemIds.forEach((itemId) => {
            this.removeItem(itemId);
        });
    };

    addItem = (item: Item) => {
        if (this.items.length + 1 > Inventory.MAX_SIZE) {
            throw new Error("Your inventory is full");
        }
        this.items.push(item);
    };

    addItems = (items: Item[]) => {
        if (this.items.length + items.length > Inventory.MAX_SIZE) {
            throw new Error("Your inventory is full");
        }
        this.items.push(...items);
    };

    /**
     * Gets a convenient representation of the items, adding each to a
     * set of objects with 'item' and 'quantity' fields. Example:
     * [{
     *  "item": Item<Sword>
     *  "quantity": 1
     * }]
     */
    getQuantities = () => {
        const inventory: { item: Item, quantity: number; }[] = [];
        this.items.forEach((item) => {
            let invItem = inventory.find(i => i.item.id === item.id);
            if (!invItem) {
                invItem = {
                    item,
                    quantity: 0
                };
                inventory.push(invItem);
            }
            invItem.quantity++;
        });
        return inventory;
    };

    /**
     * Returns a representation of the inventory used in items-related
     * user interactions. Example:
     * [
     *  {
     *      value: "sword",
     *      label: "Sword (1)"
     *  },
     *  {
     *      value: "potion",
     *      label: "Potion (2)"
     *  }
     * ]
     */
    getInteractionOptions = () => {
        const stock: { value: string, label: string; }[] = [];
        const inventory = this.getQuantities();
        inventory.forEach((invItem) => {
            stock.push({
                value: invItem.item.id,
                label: `${invItem.item.name} (${invItem.quantity})`
            });
        });
        return stock;
    };
}
