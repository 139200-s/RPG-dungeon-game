class Item extends Entity {
    constructor(id, name, description, type, slot, stats = {}, rarity = 'common') {
        super(0, 0); // Position will be set when spawned in world
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.slot = slot;
        this.stats = stats;
        this.rarity = rarity;
        this.isCollected = false;
        this.collidable = false;
        this.sprite = null; // Will be loaded by ItemManager

        // Common stats
        this.stackable = type === 'consumable';
        this.maxStack = type === 'consumable' ? 99 : 1;
    }

    // Static factory methods for different item types
    static createWeapon(id, name, description, damage, range = 1, stats = {}) {
        const item = new Item(
            id,
            name,
            description,
            'weapon',
            'weapon',
            {
                damage,
                range,
                ...stats
            }
        );
        item.use = () => false; // Weapons are equipped, not used
        return item;
    }

    static createArmor(id, name, description, slot, defense, stats = {}) {
        const item = new Item(
            id,
            name,
            description,
            'armor',
            slot,
            {
                defense,
                ...stats
            }
        );
        item.use = () => false; // Armor is equipped, not used
        return item;
    }

    static createPotion(id, name, description, effect) {
        const item = new Item(
            id,
            name,
            description,
            'consumable',
            'consumable'
        );
        item.effect = effect;
        item.use = (player) => {
            effect(player);
            return true; // Consumables are removed after use
        };
        return item;
    }

    static createAccessory(id, name, description, effect, stats = {}) {
        const item = new Item(
            id,
            name,
            description,
            'accessory',
            'accessory',
            stats
        );
        item.effect = effect;
        item.use = () => false; // Accessories are equipped, not used
        return item;
    }
    
    update(deltaTime) {
        super.update(deltaTime);

        // Bob up and down
        this.y += Math.sin(Date.now() / 500) * 0.2;

        // Check for player collection
        const player = window.game.player;
        const distance = Math.sqrt(
            Math.pow(player.x - this.x, 2) +
            Math.pow(player.y - this.y, 2)
        );

        if (distance < 20) { // Collection range
            this.collect(player);
        }
    }

    collect(player) {
        if (!this.isCollected) {
            if (player.inventory.addItem(this)) {
                this.isCollected = true;
                // Show collection message
                window.game.ui.showMessage(`Collected ${this.name}`);
            }
        }
    }

    use(player) {
        switch(this.type) {
            case 'health':
                const healed = player.heal(this.healAmount);
                return healed > 0; // Only consume if actually healed
            
            case 'weapon':
                return player.equipItem(this);
            
            case 'armor':
                return player.equipItem(this);
            
            case 'accessory':
                return player.equipItem(this);
            
            case 'scroll':
                this.castSpell(player);
                return true; // Always consume scrolls
        }
        return false;
    }

    castSpell(player) {
        if (this.areaEffect) {
            // Create area effect
            const effect = new AreaEffect(
                player.x,
                player.y,
                100, // radius
                this.damage,
                'fire'
            );
            window.game.effects.add(effect);
        } else {
            // Create projectile
            const angle = Math.atan2(
                window.game.input.mousePosition.y - player.y,
                window.game.input.mousePosition.x - player.x
            );
            const projectile = new Projectile(
                player.x,
                player.y,
                Math.cos(angle) * 5,
                Math.sin(angle) * 5,
                this.damage
            );
            window.game.projectiles.add(projectile);
        }
    }
}