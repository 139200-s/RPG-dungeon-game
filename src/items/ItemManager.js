class ItemManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.items = new Map();
        this.initializeItems();
    }

    initializeItems() {
        // Add weapons
        this.registerItem(Item.createWeapon(
            'sword',
            'Iron Sword',
            'A basic iron sword',
            10, // damage
            1.2 // range
        ));

        this.registerItem(Item.createWeapon(
            'dagger',
            'Steel Dagger',
            'A quick stabbing weapon',
            6,
            0.8,
            { criticalChance: 0.1 }
        ));

        this.registerItem(Item.createWeapon(
            'spear',
            'Long Spear',
            'A spear with extended reach',
            8,
            2.0
        ));

        // Add armor
        this.registerItem(Item.createArmor(
            'leather_chest',
            'Leather Chestpiece',
            'Basic leather armor',
            'chest',
            3
        ));

        this.registerItem(Item.createArmor(
            'iron_helmet',
            'Iron Helmet',
            'Protective headgear',
            'head',
            2
        ));

        this.registerItem(Item.createArmor(
            'iron_boots',
            'Iron Boots',
            'Heavy but protective boots',
            'feet',
            2,
            { speed: -0.1 }
        ));

        // Add potions
        this.registerItem(Item.createPotion(
            'health_potion',
            'Health Potion',
            'Restores 50 HP',
            (player) => player.heal(50)
        ));

        this.registerItem(Item.createPotion(
            'strength_potion',
            'Strength Potion',
            'Temporarily increases strength by 5',
            (player) => {
                const buff = {
                    id: 'strength_boost',
                    type: 'strength',
                    multiplier: 1.5,
                    duration: 30 // 30 seconds
                };
                player.addBuff(buff);
            }
        ));

        // Load sprites (placeholder for now)
        this.loadSprites();
    }

    registerItem(item) {
        this.items.set(item.id, item);
    }

    getItem(id) {
        return this.items.get(id);
    }

    loadSprites() {
        // This would normally load actual sprite images
        // For now, we'll use placeholder rectangles in the render method
    }

    createLoot(level) {
        const items = [];
        const roll = Math.random();

        // Basic loot table system
        if (roll < 0.4) { // 40% chance for health potion
            items.push({
                item: this.getItem('health_potion'),
                quantity: 1
            });
        }

        if (roll < 0.2) { // 20% chance for weapon
            const weapons = ['sword', 'dagger', 'spear'];
            const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
            items.push({
                item: this.getItem(randomWeapon),
                quantity: 1
            });
        }

        // Add gold
        const goldAmount = Math.floor(Math.random() * 10 * level) + level * 5;
        items.push({
            gold: goldAmount
        });

        return items;
    }
}