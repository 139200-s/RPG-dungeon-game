class Inventory {
    constructor(owner) {
        this.owner = owner;
        
        // Equipment slots
        this.equipment = {
            weaponSlot1: null,
            weaponSlot2: null,
            shield: null,
            chestplate: null,
            leggings: null,
            helmet: null,
            boots: null,
            gloves: null,
            ring1: null,
            ring2: null,
            amulet: null,
            potion1: null,
            potion2: null,
            potion3: null,
            ability1: null,
            ability2: null,
            ability3: null,
            sidekick1: null,
            sidekick2: null,
            misc1: null
        };

        // Regular inventory (3 of each type + equipped)
        this.items = new Map();
        this.maxStackSize = 3;
    }

    // Equipment methods
    equip(item) {
        const slot = this.getEquipmentSlot(item);
        if (!slot) return false;

        // If slot is occupied, unequip first
        if (this.equipment[slot]) {
            this.unequip(slot);
        }

        // Remove from inventory if present
        this.removeItem(item);

        // Equip item
        this.equipment[slot] = item;
        item.onEquip(this.owner);

        return true;
    }

    unequip(slot) {
        const item = this.equipment[slot];
        if (!item) return false;

        // Only unequip if we can add to inventory
        if (!this.canAddItem(item)) return false;

        // Remove from equipment
        this.equipment[slot] = null;
        item.onUnequip(this.owner);

        // Add to inventory
        this.addItem(item);

        return true;
    }

    getEquipmentSlot(item) {
        switch (item.type) {
            case 'weapon':
                return this.equipment.weaponSlot1 ? 
                    (this.equipment.weaponSlot2 ? null : 'weaponSlot2') : 
                    'weaponSlot1';
            case 'shield':
                return 'shield';
            case 'chestplate':
                return 'chestplate';
            case 'leggings':
                return 'leggings';
            case 'helmet':
                return 'helmet';
            case 'boots':
                return 'boots';
            case 'gloves':
                return 'gloves';
            case 'ring':
                return this.equipment.ring1 ? 
                    (this.equipment.ring2 ? null : 'ring2') : 
                    'ring1';
            case 'amulet':
                return 'amulet';
            case 'potion':
                return this.getFirstEmptyPotionSlot();
            case 'ability':
                return this.getFirstEmptyAbilitySlot();
            case 'sidekick':
                return this.equipment.sidekick1 ? 
                    (this.equipment.sidekick2 ? null : 'sidekick2') : 
                    'sidekick1';
            case 'misc':
                return 'misc1';
            default:
                return null;
        }
    }

    getFirstEmptyPotionSlot() {
        for (let i = 1; i <= 3; i++) {
            const slot = `potion${i}`;
            if (!this.equipment[slot]) return slot;
        }
        return null;
    }

    getFirstEmptyAbilitySlot() {
        for (let i = 1; i <= 3; i++) {
            const slot = `ability${i}`;
            if (!this.equipment[slot]) return slot;
        }
        return null;
    }

    // Inventory methods
    addItem(item) {
        if (!this.canAddItem(item)) return false;

        const stack = this.findStack(item);
        if (stack) {
            stack.count++;
        } else {
            this.items.set(item.id, {
                item: item,
                count: 1
            });
        }

        return true;
    }

    removeItem(item) {
        const stack = this.findStack(item);
        if (!stack) return false;

        stack.count--;
        if (stack.count <= 0) {
            this.items.delete(item.id);
        }

        return true;
    }

    canAddItem(item) {
        const stack = this.findStack(item);
        if (stack) {
            return stack.count < this.maxStackSize;
        }
        return this.items.size < this.getMaxItemsOfType(item.type);
    }

    findStack(item) {
        return this.items.get(item.id);
    }

    getMaxItemsOfType(type) {
        // 3 of each type + what's equipped
        let equipped = 0;
        for (const [slot, item] of Object.entries(this.equipment)) {
            if (item && item.type === type) equipped++;
        }
        return 3 + equipped;
    }

    // Query methods
    getEquippedWeapons() {
        return [this.equipment.weaponSlot1, this.equipment.weaponSlot2]
            .filter(w => w !== null);
    }

    getEquippedArmor() {
        return [
            this.equipment.helmet,
            this.equipment.chestplate,
            this.equipment.leggings,
            this.equipment.boots,
            this.equipment.gloves
        ].filter(a => a !== null);
    }

    getEquippedAccessories() {
        return [
            this.equipment.ring1,
            this.equipment.ring2,
            this.equipment.amulet
        ].filter(a => a !== null);
    }

    getEquippedPotions() {
        return [
            this.equipment.potion1,
            this.equipment.potion2,
            this.equipment.potion3
        ].filter(p => p !== null);
    }

    getEquippedAbilities() {
        return [
            this.equipment.ability1,
            this.equipment.ability2,
            this.equipment.ability3
        ].filter(a => a !== null);
    }

    getEquippedSidekicks() {
        return [
            this.equipment.sidekick1,
            this.equipment.sidekick2
        ].filter(s => s !== null);
    }

    getAllItems() {
        const items = [];
        for (const stack of this.items.values()) {
            items.push({
                item: stack.item,
                count: stack.count
            });
        }
        return items;
    }

    // Stats calculation
    calculateStats() {
        const stats = {
            defense: 0,
            strength: 0,
            criticalChance: 0.05, // Base 5% crit chance
            resistances: {
                fire: 0,
                ice: 0,
                poison: 0,
                lightning: 0
            }
        };

        // Add equipment stats
        for (const item of Object.values(this.equipment)) {
            if (item) {
                this.addItemStats(stats, item);
            }
        }

        return stats;
    }

    addItemStats(stats, item) {
        if (item.stats.defense) stats.defense += item.stats.defense;
        if (item.stats.strength) stats.strength += item.stats.strength;
        if (item.stats.criticalChance) stats.criticalChance += item.stats.criticalChance;
        
        // Add resistances
        if (item.stats.resistances) {
            for (const [type, value] of Object.entries(item.stats.resistances)) {
                stats.resistances[type] = (stats.resistances[type] || 0) + value;
            }
        }
    }

    // Save/Load
    save() {
        return {
            equipment: Object.fromEntries(
                Object.entries(this.equipment)
                    .map(([slot, item]) => [slot, item ? item.save() : null])
            ),
            items: Array.from(this.items.entries())
                .map(([id, stack]) => ({
                    id,
                    item: stack.item.save(),
                    count: stack.count
                }))
        };
    }

    load(data) {
        // Load equipment
        for (const [slot, itemData] of Object.entries(data.equipment)) {
            if (itemData) {
                this.equipment[slot] = Item.load(itemData);
            }
        }

        // Load inventory
        this.items.clear();
        for (const stackData of data.items) {
            this.items.set(stackData.id, {
                item: Item.load(stackData.item),
                count: stackData.count
            });
        }
    }
}