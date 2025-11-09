class Door extends Entity {
    constructor(x, y) {
        super(x, y);
        this.isOpen = false;
        this.interactable = true;
        
        // Door properties
        this.width = 32;
        this.height = 32;
        this.collidable = !this.isOpen;
    }

    interact(player) {
        this.isOpen = !this.isOpen;
        this.collidable = !this.isOpen;
        
        // Play sound effect if we have an audio system
        if (window.game.audio) {
            window.game.audio.play(this.isOpen ? 'door_open' : 'door_close');
        }
    }

    render(ctx, camera) {
        const pos = camera.worldToScreen(this.x, this.y);
        
        // Get appropriate sprite based on state
        const sprite = window.game.assetLoader.getSprite(
            this.isOpen ? 'door_open' : 'door_closed'
        );
        
        if (sprite) {
            ctx.drawImage(sprite, pos.x - 16, pos.y - 16, 32, 32);
        } else {
            // Fallback to colored rectangle
            ctx.fillStyle = this.isOpen ? '#654' : '#976';
            ctx.fillRect(pos.x - 16, pos.y - 16, 32, 32);
            
            // Draw border
            ctx.strokeStyle = '#432';
            ctx.lineWidth = 2;
            ctx.strokeRect(pos.x - 16, pos.y - 16, 32, 32);
            
            // Draw door detail
            if (!this.isOpen) {
                ctx.beginPath();
                ctx.arc(pos.x + 4, pos.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#432';
                ctx.fill();
            }
        }
    }
}