class AssetLoader {
    constructor() {
        this.sprites = new Map();
        this.loadingPromises = [];
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async loadAll() {
        // Create temporary sprites until real assets are available
        
        // Player sprites
        this.sprites.set('player_down_0', this.createTempSprite('#0f0'));
        this.sprites.set('player_up_0', this.createTempSprite('#0f0'));
        this.sprites.set('player_left_0', this.createTempSprite('#0f0'));
        this.sprites.set('player_right_0', this.createTempSprite('#0f0'));

        // Tile sprites
        this.sprites.set('tile_floor', this.createTempSprite('#444'));
        this.sprites.set('tile_wall', this.createTempSprite('#666'));
        this.sprites.set('tile_crystal', this.createTempSprite('#66f'));
        this.sprites.set('tile_mushroom', this.createTempSprite('#6c6'));
        this.sprites.set('tile_lava', this.createTempSprite('#f66'));
        this.sprites.set('tile_chasm', this.createTempSprite('#111'));

        // Enemy sprites
        this.sprites.set('enemy_basic', this.createTempSprite('#f00'));
        this.sprites.set('enemy_fast', this.createTempSprite('#f60'));
        this.sprites.set('enemy_tank', this.createTempSprite('#f06'));
        this.sprites.set('enemy_ranged', this.createTempSprite('#60f'));

        // Item sprites
        this.sprites.set('item_health', this.createTempSprite('#f00'));
        this.sprites.set('item_weapon', this.createTempSprite('#ff0'));
        this.sprites.set('item_armor', this.createTempSprite('#0ff'));
        this.sprites.set('item_accessory', this.createTempSprite('#f0f'));
        this.sprites.set('item_scroll', this.createTempSprite('#0f0'));

        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.loadedAssets = this.totalAssets;
    }

    async loadSprite(name, path) {
        try {
            const image = new Image();
            const promise = new Promise((resolve, reject) => {
                image.onload = () => {
                    this.sprites.set(name, image);
                    this.loadedAssets++;
                    this.updateLoadingProgress();
                    resolve();
                };
                image.onerror = () => {
                    console.warn(`Failed to load sprite: ${path}`);
                    this.loadedAssets++;
                    this.updateLoadingProgress();
                    // Resolve anyway to continue loading other assets
                    resolve();
                };
            });

            image.src = path;
            this.totalAssets++;
            await promise;

        } catch (error) {
            console.error(`Error loading sprite ${name}:`, error);
            this.loadedAssets++;
            this.updateLoadingProgress();
        }
    }

    updateLoadingProgress() {
        const progress = (this.loadedAssets / this.totalAssets) * 100;
        // Update loading screen if it exists
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            const spinner = loadingScreen.querySelector('.loading-spinner');
            if (spinner) {
                spinner.style.borderTopColor = `hsl(${progress * 2.4}, 70%, 50%)`;
                spinner.style.transform = `rotate(${progress * 3.6}deg)`;
            }
        }
    }

    getSprite(name) {
        return this.sprites.get(name);
    }

    // Return a random sprite whose key starts with the given prefix (e.g. 'tile_lava')
    getRandomSprite(prefix) {
        const matches = [];
        for (const key of this.sprites.keys()) {
            if (key === prefix || key.startsWith(prefix + '_')) matches.push(key);
        }
        if (matches.length === 0) return this.getSprite(prefix);
        const pick = matches[Math.floor(Math.random() * matches.length)];
        return this.sprites.get(pick) || this.getSprite(prefix);
    }

    createTempSprite(color = '#f00', width = 32, height = 32) {
        // Create a temporary canvas for placeholder sprites
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw a simple colored rectangle with a border
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width - 2, height - 2);

        // Add a diagonal line to make it more visible
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        return canvas;
    }
}