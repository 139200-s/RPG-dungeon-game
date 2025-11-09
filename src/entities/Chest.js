class Chest extends Entity {
    constructor(loot) {
        super(0, 0);
        this.loot = loot;
        this.isOpen = false;
        this.sprite = Sprites.get('chest_closed');
        this.width = 32;  // TILE_SIZE
        this.height = 32; // TILE_SIZE
    }

    setPosition(x, y) {
        this.x = x * 32; // Convert from grid coordinates to pixel coordinates
        this.y = y * 32;
    }

    open() {
        if (!this.isOpen) {
            this.isOpen = true;
            this.sprite = Sprites.get('chest_open');
            return this.loot;
        }
        return null;
    }

    render(ctx) {
        ctx.drawImage(
            this.sprite,
            this.x * TILE_SIZE,
            this.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
    }
}