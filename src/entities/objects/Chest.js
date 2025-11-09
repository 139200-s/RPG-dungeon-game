class Chest extends Entity {
    constructor(x, y, loot = []) {
        super(x, y);
        this.loot = loot;
        this.isOpen = false;
        this.interactable = true;
        
        // Chest properties
        this.width = 32;
        this.height = 32;
        this.collidable = true;
    }

    interact(player) {
        if (!this.isOpen) {
            // Transfer loot to player's inventory
            for (const item of this.loot) {
                if (player.inventory.addItem(item)) {
                    // Show pickup message
                    if (window.game.ui) {
                        window.game.ui.showMessage(`Found ${item.name}!`);
                    }
                } else {
                    // Inventory full, drop item near chest
                    item.x = this.x + (Math.random() * 40 - 20);
                    item.y = this.y + (Math.random() * 40 - 20);
                    window.game.world.items.push(item);
                }
            }
            
            this.isOpen = true;
            this.loot = [];
            
            // Save chest state
            if (window.game.saveManager) {
                window.game.saveManager.saveChestOpened(this.x, this.y);
            }
        }
    }

    render(ctx, camera) {
        const pos = camera.worldToScreen(this.x, this.y);
        
        // Get appropriate sprite from Sprites class
        const sprite = Sprites.get(this.isOpen ? 'chest_open' : 'chest_closed');
        
        if (sprite) {
            ctx.drawImage(sprite, pos.x - this.width/2, pos.y - this.height/2, this.width, this.height);
        } else {
            // Fallback to colored rectangle (should never happen with new Sprites class)
            ctx.fillStyle = this.isOpen ? '#865' : '#986';
            ctx.fillRect(pos.x - this.width/2, pos.y - this.height/2, this.width, this.height);
            
            // Draw border
            ctx.strokeStyle = '#432';
            ctx.lineWidth = 2;
            ctx.strokeRect(pos.x - this.width/2, pos.y - this.height/2, this.width, this.height);
        }
    }
}