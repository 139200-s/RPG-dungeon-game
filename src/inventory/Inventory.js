class Inventory {
    constructor(owner) {
        this.owner = owner;
        this.items = new Map(); // Map of item ID to { item, quantity }
        this.gold = 0;
        this.maxSlots = 20;
        
        // Equipment slots
        this.equipment = {
            weapon: null,
            offhand: null,
            head: null,
            chest: null,
            legs: null,
            feet: null,
            ring1: null,
            ring2: null,
            amulet: null
        };
        
        // Event callbacks
        this.onItemAdded = null;
        this.onItemRemoved = null;
        this.onEquipmentChanged = null;
    }

    addItem(item, quantity = 1) {
        if (this.isFull() && !this.hasItem(item.id)) {
            return false;
        }

        const existingStack = this.items.get(item.id);
        if (existingStack) {
            existingStack.quantity += quantity;
        } else {
            this.items.set(item.id, { item, quantity });
        }

        if (this.onItemAdded) {
            this.onItemAdded(item, quantity);
        }

        return true;
    }

    removeItem(itemId, quantity = 1) {
        const stack = this.items.get(itemId);
        if (!stack || stack.quantity < quantity) {
            return false;
        }

        stack.quantity -= quantity;
        if (stack.quantity <= 0) {
            this.items.delete(itemId);
        }

        if (this.onItemRemoved) {
            this.onItemRemoved(stack.item, quantity);
        }

        return true;
    }

    hasItem(itemId, quantity = 1) {
        const stack = this.items.get(itemId);
        return stack && stack.quantity >= quantity;
    }

    getItemCount(itemId) {
        const stack = this.items.get(itemId);
        return stack ? stack.quantity : 0;
    }

    getItems() {
        return Array.from(this.items.values());
    }

    isFull() {
        return this.items.size >= this.maxSlots;
    }

    addGold(amount) {
        this.gold = Math.max(0, this.gold + amount);
    }

    removeGold(amount) {
        if (this.gold < amount) {
            return false;
        }
        this.gold -= amount;
        return true;
    }

    equipItem(itemId) {
        const stack = this.items.get(itemId);
        if (!stack) return false;

        const item = stack.item;
        const slot = item.slot;

        if (!this.equipment.hasOwnProperty(slot)) {
            return false;
        }

        // Unequip current item in slot if any
        const currentEquipped = this.equipment[slot];
        if (currentEquipped) {
            this.addItem(currentEquipped);
            this.equipment[slot] = null;
        }

        // Remove item from inventory and equip it
        this.removeItem(itemId);
        this.equipment[slot] = item;

        if (this.onEquipmentChanged) {
            this.onEquipmentChanged(slot, item);
        }

        return true;
    }

    unequipItem(slot) {
        if (!this.equipment.hasOwnProperty(slot) || !this.equipment[slot]) {
            return false;
        }

        const item = this.equipment[slot];
        if (this.isFull()) {
            return false;
        }

        this.addItem(item);
        this.equipment[slot] = null;

        if (this.onEquipmentChanged) {
            this.onEquipmentChanged(slot, null);
        }

        return true;
    }

    getEquippedItem(slot) {
        return this.equipment[slot];
    }

    getEquippedItems() {
        return Object.values(this.equipment).filter(item => item !== null);
    }

    getEquippedWeapons() {
        return [this.equipment.weapon, this.equipment.offhand]
            .filter(weapon => weapon !== null);
    }

    save() {
        return {
            gold: this.gold,
            items: Array.from(this.items.entries()).map(([id, stack]) => ({
                id,
                quantity: stack.quantity
            })),
            equipment: Object.entries(this.equipment)
                .filter(([_, item]) => item !== null)
                .map(([slot, item]) => ({
                    slot,
                    itemId: item.id
                }))
        };
    }

    load(data) {
        this.gold = data.gold;
        
        // Clear current inventory
        this.items.clear();
        Object.keys(this.equipment).forEach(slot => {
            this.equipment[slot] = null;
        });
        
        // Load items
        for (const itemData of data.items) {
            const item = this.owner.gameEngine.itemManager.getItem(itemData.id);
            if (item) {
                this.addItem(item, itemData.quantity);
            }
        }
        
        // Load equipment
        for (const equipData of data.equipment) {
            const item = this.owner.gameEngine.itemManager.getItem(equipData.itemId);
            if (item) {
                this.equipItem(item.id);
            }
        }
    }
}