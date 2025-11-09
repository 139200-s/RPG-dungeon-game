class Weapon extends Entity {
    constructor(x, y, type = 'basic') {
        super(x, y);
        this.type = type;
        this.damage = 10;
        this.width = 32;
        this.height = 32;
        this.sprite = Sprites.get('item_weapon');
        this.isCollected = false;
    }

    collect(player) {
        player.inventory.addItem(this);
        this.isCollected = true;
    }

    render(ctx, camera) {
        const pos = camera.worldToScreen(this.x, this.y);
        ctx.drawImage(
            this.sprite,
            pos.x - this.width/2,
            pos.y - this.height/2,
            this.width,
            this.height
        );
    }
}