class Projectile extends Entity {
    constructor(x, y, velocityX, velocityY, damage) {
        super(x, y);
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.damage = damage;
        this.range = 500;
        this.distanceTraveled = 0;
        this.width = 16;
        this.height = 16;
        this.collidable = false;
    }

    update(deltaTime) {
        // Move projectile
        const moveX = this.velocityX * deltaTime;
        const moveY = this.velocityY * deltaTime;
        
        this.x += moveX;
        this.y += moveY;
        
        // Update distance traveled
        this.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);
        
        // Check if projectile has exceeded its range
        if (this.distanceTraveled >= this.range) {
            this.destroy();
            return;
        }
        
        // Check for collisions with walls
        if (window.game.world.checkCollision(this.x, this.y)) {
            this.destroy();
            return;
        }
        
        // Check for collisions with entities
        this.checkEntityCollisions();
    }

    checkEntityCollisions() {
        // Get entities in range
        const entities = window.game.world.getEntitiesInRange(
            this.x,
            this.y,
            this.width
        );
        
        for (const entity of entities) {
            // Skip if this is our own projectile
            if (entity === this.owner) continue;
            
            // Check if entity can be damaged
            if (entity.takeDamage) {
                entity.takeDamage(this.damage);
                this.destroy();
                break;
            }
        }
    }

    destroy() {
        this.isDead = true;
        
        // Create impact effect
        if (window.game.particles) {
            window.game.particles.add(
                new ImpactEffect(this.x, this.y)
            );
        }
    }

    render(ctx, camera) {
        const pos = camera.worldToScreen(this.x, this.y);
        
        // Get projectile sprite
        const sprite = window.game.assetLoader.getSprite('projectile');
        
        if (sprite) {
            // Calculate rotation angle
            const angle = Math.atan2(this.velocityY, this.velocityX);
            
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(angle);
            ctx.drawImage(sprite, -8, -8, 16, 16);
            ctx.restore();
        } else {
            // Fallback to colored circle
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0';
            ctx.fill();
            
            // Draw motion trail
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(
                pos.x - this.velocityX * 0.1,
                pos.y - this.velocityY * 0.1
            );
            ctx.strokeStyle = '#ff06';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}