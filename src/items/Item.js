class Item {
    constructor(id, name, description, slot, stats = {}, rarity = 'common') {
        this.id = id;
        this.name = name;
        this.description = description;
        this.slot = slot;
        this.stats = stats;
        this.rarity = rarity;
        this.sprite = null; // Will be loaded by ItemManager
    }

    use(player) {
        // Override in subclasses
        return false;
    }

    canUse(player) {
        // Override in subclasses
        return false;
    }

    getTooltip() {
        let tooltip = `${this.name}\n${this.description}\n`;

        if (Object.keys(this.stats).length > 0) {
            tooltip += '\nStats:\n';
            for (const [stat, value] of Object.entries(this.stats)) {
                if (stat === 'criticalChance') {
                    tooltip += `Critical Chance: +${value * 100}%\n`;
                } else {
                    tooltip += `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value > 0 ? '+' : ''}${value}\n`;
                }
            }
        }

        return tooltip;
    }

    getDisplayColor() {
        switch (this.rarity) {
            case 'common': return '#ffffff';
            case 'uncommon': return '#00ff00';
            case 'rare': return '#0000ff';
            case 'epic': return '#800080';
            case 'legendary': return '#ffa500';
            default: return '#ffffff';
        }
    }

    // Static factory methods for different item types
    static createWeapon(id, name, description, damage, range = 1, stats = {}) {
        const item = new Item(id, name, description, 'weapon', {
            damage,
            range,
            ...stats
        });
        item.use = () => false; // Weapons are equipped, not used
        item.canUse = () => false;
        return item;
    }

    static createArmor(id, name, description, slot, defense, stats = {}) {
        const item = new Item(id, name, description, slot, {
            defense,
            ...stats
        });
        item.use = () => false; // Armor is equipped, not used
        item.canUse = () => false;
        return item;
    }

    static createPotion(id, name, description, effect) {
        const item = new Item(id, name, description, 'consumable');
        item.use = (player) => {
            effect(player);
            return true; // Consumables are removed after use
        };
        item.canUse = () => true;
        return item;
    }
}