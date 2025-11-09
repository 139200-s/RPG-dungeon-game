class HealthPotion extends Entity {
    constructor(x, y, amount = 50) {
        super(x, y);
        this.amount = amount;
        this.width = 32;
        this.height = 32;
        this.sprite = Sprites.get('item_health');
        this.isCollected = false;
    }

    collect(player) {
        player.heal(this.amount);
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