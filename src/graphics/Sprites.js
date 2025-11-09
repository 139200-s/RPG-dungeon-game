class Sprites {
    static sprites = new Map();
    static initialized = false;

    static init() {
        if (this.initialized) return;
        this.initialized = true;

        // Create default sprites as colored rectangles
        this.createTempSprite('chest_closed', '#865');
        this.createTempSprite('chest_open', '#986');
        this.createTempSprite('missing', '#f0f');
    }

    static createTempSprite(name, color, size = 32) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size, size);
        
        // Add a border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, size - 2, size - 2);
        
        this.sprites.set(name, canvas);
    }

    static loadSprite(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites.set(name, img);
                resolve();
            };
            img.onerror = () => {
                console.warn(`Failed to load sprite: ${path}`);
                // Use temp sprite if loading fails
                this.createTempSprite(name, '#f0f');
                resolve();
            };
            img.src = path;
        });
    }

    static get(name) {
        if (!this.initialized) this.init();
        return this.sprites.get(name) || this.sprites.get('missing');
    }
}

// Initialize sprites when script loads
Sprites.init();