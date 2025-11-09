class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.zoom = 1;
        
        // For smooth camera movement
        this.targetX = 0;
        this.targetY = 0;
        this.smoothing = 0.1;
    }

    follow(entity) {
        this.targetX = -entity.x + this.width / 2;
        this.targetY = -entity.y + this.height / 2;
        
        // Smooth camera movement
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX + this.x) * this.zoom,
            y: (worldY + this.y) * this.zoom
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.zoom) - this.x,
            y: (screenY / this.zoom) - this.y
        };
    }

    isOnScreen(x, y, margin = 0) {
        return x + margin >= 0 && x - margin <= this.width &&
               y + margin >= 0 && y - margin <= this.height;
    }

    shake(intensity = 5, duration = 500) {
        const startTime = Date.now();
        const originalX = this.x;
        const originalY = this.y;
        
        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const remaining = 1 - (elapsed / duration);
                const shakeIntensity = intensity * remaining;
                this.x = originalX + (Math.random() * 2 - 1) * shakeIntensity;
                this.y = originalY + (Math.random() * 2 - 1) * shakeIntensity;
                requestAnimationFrame(shake);
            } else {
                this.x = originalX;
                this.y = originalY;
            }
        };
        
        shake();
    }
}