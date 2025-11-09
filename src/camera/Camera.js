class Camera {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.targetX = 0;
        this.targetY = 0;
        this.targetScale = 1;
        this.smoothing = 0.1; // Camera movement smoothing factor
        this.bounds = null; // Camera bounds for world edge clamping
    }

    update(deltaTime) {
        // Smooth camera movement
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
        this.scale += (this.targetScale - this.scale) * this.smoothing;

        // Clamp to bounds if set
        if (this.bounds) {
            const halfWidth = this.gameEngine.canvas.width / (2 * this.scale);
            const halfHeight = this.gameEngine.canvas.height / (2 * this.scale);

            this.x = Math.max(this.bounds.left + halfWidth, Math.min(this.bounds.right - halfWidth, this.x));
            this.y = Math.max(this.bounds.top + halfHeight, Math.min(this.bounds.bottom - halfHeight, this.y));
        }
    }

    follow(entity, instant = false) {
        if (instant) {
            this.x = entity.x;
            this.y = entity.y;
            this.targetX = entity.x;
            this.targetY = entity.y;
        } else {
            this.targetX = entity.x;
            this.targetY = entity.y;
        }
    }

    setBounds(left, top, right, bottom) {
        this.bounds = { left, top, right, bottom };
    }

    clearBounds() {
        this.bounds = null;
    }

    zoom(targetScale, instant = false) {
        if (instant) {
            this.scale = targetScale;
            this.targetScale = targetScale;
        } else {
            this.targetScale = targetScale;
        }
    }

    shake(intensity = 10, duration = 0.5) {
        let elapsed = 0;
        let originalX = this.x;
        let originalY = this.y;

        const shakeInterval = setInterval(() => {
            elapsed += 0.016; // Assuming 60 FPS
            if (elapsed >= duration) {
                clearInterval(shakeInterval);
                this.x = originalX;
                this.y = originalY;
                return;
            }

            const decreaseFactor = 1 - (elapsed / duration);
            const currentIntensity = intensity * decreaseFactor;

            this.x = originalX + (Math.random() - 0.5) * currentIntensity;
            this.y = originalY + (Math.random() - 0.5) * currentIntensity;
        }, 16);
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.scale + this.gameEngine.canvas.width / 2,
            y: (worldY - this.y) * this.scale + this.gameEngine.canvas.height / 2
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.gameEngine.canvas.width / 2) / this.scale + this.x,
            y: (screenY - this.gameEngine.canvas.height / 2) / this.scale + this.y
        };
    }

    isOnScreen(worldX, worldY, margin = 0) {
        const screenPos = this.worldToScreen(worldX, worldY);
        return screenPos.x + margin >= 0 &&
               screenPos.x - margin <= this.gameEngine.canvas.width &&
               screenPos.y + margin >= 0 &&
               screenPos.y - margin <= this.gameEngine.canvas.height;
    }

    applyTransform(ctx) {
        ctx.save();
        ctx.translate(this.gameEngine.canvas.width / 2, this.gameEngine.canvas.height / 2);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-this.x, -this.y);
    }

    resetTransform(ctx) {
        ctx.restore();
    }
}