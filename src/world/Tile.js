class Tile {
    constructor(type, x, y, textureManager) {
        this.type = type;
        this.x = x;
        this.y = y;

        // Kies vaste texture key bij aanmaak via textureManager
        if (textureManager) {
            this.textureKey = this.assignTexture(textureManager);
        }

        // Rest van je constructor...
        switch (type) {
            case 'wall':
                this.collidable = true;
                this.color = '#666';
                break;
            case 'floor':
                this.collidable = false;
                this.color = '#444';
                break;
            case 'mushroom':
                this.collidable = false;
                this.color = '#6c6';
                this.slowdown = 0.5;
                break;
            case 'lava':
                this.collidable = false;
                this.hazard = true;
                this.color = '#f66';
                this.damage = 8;
                break;
            case 'chasm':
                this.collidable = true;
                this.color = '#111';
                this.deadly = true;
                break;
            default:
                this.collidable = false;
                this.color = '#333';
        }
    }

render(ctx, camera, textureManager) {
    const screenPos = camera.worldToScreen(this.x * 32, this.y * 32);
    if (!camera.isOnScreen(screenPos.x, screenPos.y, 32)) return;

    let sprite = null;
    if (textureManager && this.textureKey) {
        sprite = textureManager.getTextureByKey(this.textureKey);
    }

    if (sprite instanceof HTMLImageElement && sprite.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, screenPos.x - 16, screenPos.y - 16, 32, 32);
    } else {
        ctx.fillStyle = this.color;
        ctx.fillRect(screenPos.x - 16, screenPos.y - 16, 32, 32);
    }

    if (this.glowing) {
        ctx.save();
        ctx.globalAlpha = 0.1 + 0.05 * Math.sin(Date.now() / 500);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}


}
