class Entity {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.speed = 0;
        this.direction = 'down';
        this.isDead = false;
        this.isMoving = false;
        this.animationFrame = 0;
        this.animationSpeed = 0.1;
        
        // Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.defense = 0;
        this.strength = 1;
        
        // Collision
        this.collidable = true;
        
        // Effects
        this.effects = new Set();
    }

    update(deltaTime) {
        // Update animation
        if (this.isMoving) {
            this.animationFrame = (this.animationFrame + this.animationSpeed) % 4;
        } else {
            this.animationFrame = 0;
        }

        // Update effects
        for (const effect of this.effects) {
            effect.update(deltaTime);
            if (effect.isDone) {
                this.effects.delete(effect);
            }
        }
    }

    render(ctx, camera) {
        const pos = camera.worldToScreen(this.x, this.y);
        
        // Get sprite based on direction and animation frame
        const sprite = window.game.assetLoader.getSprite(
            `${this.constructor.name.toLowerCase()}_${this.direction}_${Math.floor(this.animationFrame)}`
        );
        
        if (sprite) {
            ctx.drawImage(sprite, pos.x - this.width/2, pos.y - this.height/2, this.width, this.height);
        } else {
            // Fallback to colored rectangle
            ctx.fillStyle = '#0f0';
            ctx.fillRect(pos.x - this.width/2, pos.y - this.height/2, this.width, this.height);
        }

        // Render health bar if damaged
        if (this.health < this.maxHealth) {
            this.renderHealthBar(ctx, pos);
        }

        // Render effects
        for (const effect of this.effects) {
            effect.render(ctx, pos);
        }
    }

    renderHealthBar(ctx, pos) {
        const width = this.width;
        const height = 4;
        const healthPercent = this.health / this.maxHealth;

        // Background
        ctx.fillStyle = '#500';
        ctx.fillRect(pos.x - width/2, pos.y - this.height/2 - 8, width, height);

        // Health
        ctx.fillStyle = '#f00';
        ctx.fillRect(pos.x - width/2, pos.y - this.height/2 - 8, width * healthPercent, height);
    }

    takeDamage(amount) {
        const actualDamage = Math.max(1, amount - this.defense);
        this.health -= actualDamage;

        // Create damage number particle
        window.game.particles.add(new DamageNumber(this.x, this.y, actualDamage));

        if (this.health <= 0) {
            this.die();
        }

        return actualDamage;
    }

    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        const healedAmount = this.health - oldHealth;

        if (healedAmount > 0) {
            // Create healing number particle
            window.game.particles.add(new HealNumber(this.x, this.y, healedAmount));
        }

        return healedAmount;
    }

    die() {
        this.isDead = true;
    }

    isAlive() {
        return !this.isDead;
    }

    addEffect(effect) {
        this.effects.add(effect);
    }

    removeEffect(effectType) {
        for (const effect of this.effects) {
            if (effect instanceof effectType) {
                this.effects.delete(effect);
            }
        }
    }

    containsPoint(x, y) {
        return x >= this.x - this.width/2 && x < this.x + this.width/2 &&
               y >= this.y - this.height/2 && y < this.y + this.height/2;
    }
}