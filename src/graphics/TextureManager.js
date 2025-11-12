console.log('Loading TextureManager.js');
class TextureManager {
    constructor() {
        this.textures = new Map();
        this.tilesets = new Map();
        this.sprites = new Map();
    }

    async loadTextures() {
        const textureList = {
            'player_idle': 'assets/sprites/player/idle.svg',
            'player_run': 'assets/sprites/player/run.svg',
            'player_attack': 'assets/sprites/player/attack.svg',
            'item_health_potion': 'assets/items/health_potion.svg',
            'item_mana_potion': 'assets/items/mana_potion.svg',
            'item_sword': 'assets/items/sword.svg',
            'item_shield': 'assets/items/shield.svg',
            'ui_inventory': 'assets/ui/inventory.svg',
            'ui_healthbar': 'assets/ui/healthbar.svg',
            'ui_manabar': 'assets/ui/manabar.svg',
            'ui_minimap_icons': 'assets/ui/minimap_icons.svg'
        };

        for (const [key, path] of Object.entries(textureList)) {
            try {
                const texture = await this.loadTexture(path);
                this.textures.set(key, texture);
            } catch (error) {
                console.warn(`Failed to load texture ${key}, creating placeholder`);
                this.textures.set(key, this.createPlaceholderTexture(key));
            }
        }
    }
        async loadTextures() {
    // ... bestaande textureList ...

    const tileFolders = [
        'floor', 'wall', 'water', 'lava',
        'crystal', 'mushroom', 'pillar', 'rubble', 'chasm'
    ];
    for (const folder of tileFolders) {
        const prefix = 'tiles_' + folder;
        let maxVariants = 1;
        if (folder === 'lava') maxVariants = 15; // voor lava meer textures laden
        await this.loadTexturesFromFolder(prefix, `assets/tiles/${folder}`, folder, 'png', maxVariants);
        if (!this.textures.has(prefix)) {
            this.textures.set(prefix, this.createPlaceholderTexture(prefix));
        }
    }
}


   async loadTexturesFromFolder(prefix, folderUrl, baseName = null, ext = 'png', maxVariants = 1) { // default maxVariants 1
    if (folderUrl.endsWith('/')) folderUrl = folderUrl.slice(0, -1);
    if (!baseName) {
        baseName = prefix.replace(/^tiles?_/, '');
    }

    const loadedAny = [];
    // Probeer het basisbestand eerst
    try {
        const baseTexture = await this.loadTexture(`${folderUrl}/${baseName}.${ext}`);
        this.textures.set(prefix, baseTexture);
        loadedAny.push(prefix);
        console.log(`Loaded base texture: ${prefix} from ${folderUrl}/${baseName}.${ext}`);
    } catch {
        // Geen basisbestand gevonden, probeer verder
    }

    // Probeer varianten, indien maxVariants > 1
    for (let i = 0; i < maxVariants; i++) {
        try {
            const variantTexture = await this.loadTexture(`${folderUrl}/${baseName}_${i}.${ext}`);
            const key = `${prefix}_${i}`;
            this.textures.set(key, variantTexture);
            loadedAny.push(key);
            console.log(`Loaded texture variant: ${key} from ${folderUrl}/${baseName}_${i}.${ext}`);
        } catch {
            // variant niet gevonden, gewoon verder
        }
    }

    // fallback naar basis texture als er geen variant geladen is maar basis wel
    if (loadedAny.length === 0) {
        try {
            const fallbackTexture = await this.loadTexture(`${folderUrl}/${baseName}.${ext}`);
            this.textures.set(prefix, fallbackTexture);
            loadedAny.push(prefix);
            console.log(`Fallback base texture loaded: ${prefix}`);
        } catch {
            // fallback ook niet gevonden, maak placeholder aan
            this.textures.set(prefix, this.createPlaceholderTexture(prefix));
            console.warn(`No textures found for ${prefix}, placeholder created`);
        }
    }

    return loadedAny;
}


    createPlaceholderTexture(key) {
        const canvas = document.createElement('canvas');
        let size = 32;
        if (key.startsWith('tiles_')) size = 64;
        if (key.startsWith('player_')) size = 48;
        if (key.startsWith('ui_')) size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#666666';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(10, 10, size - 20, size - 20);
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, size, size);

        return canvas;
    }

    async loadTexture(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load texture: ${path}`));
            img.src = path;
        });
    }

    getTexture(key) {
        return this.textures.get(key) || this.createPlaceholderTexture(key);
    }

    getRandomTextureKey(prefix) {
        const matches = [];
        for (const key of this.textures.keys()) {
            if (key === prefix || key.startsWith(prefix + '_')) matches.push(key);
        }
        if (matches.length === 0) return prefix;
        return matches[Math.floor(Math.random() * matches.length)];
    }

    getTextureByKey(key) {
        return this.textures.get(key) || this.createPlaceholderTexture(key);
    }
}

class Tile {
    constructor(type, x, y, textureManager) {
        this.type = type;
        this.x = x;
        this.y = y;

        this.collidable = false;
        this.slowdown = null;
        this.damage = 0;
        this.deadly = false;
        this.hazard = false;
        this.glowing = false;
        this.color = '#333';

        // Properties based on type
        switch (type) {
            case 'wall':
                this.collidable = true;
                this.color = '#666';
                break;
            case 'floor':
                this.color = '#444';
                break;
            case 'mushroom':
                this.color = '#6c6';
                this.slowdown = 0.5;
                break;
            case 'lava':
                this.hazard = true;
                this.color = '#f66';
                this.damage = 8;
                break;
            case 'chasm':
                this.collidable = true;
                this.color = '#111';
                this.deadly = true;
                break;
        }

        // Assign a fixed random texture key per tile
        if (textureManager) {
            this.textureKey = textureManager.getRandomTextureKey(`tiles_${this.type}`);
        } else {
            this.textureKey = null;
        }
    }

    render(ctx, camera, textureManager) {
        const screenPos = camera.worldToScreen(this.x * 32, this.y * 32);
        if (!camera.isOnScreen(screenPos.x, screenPos.y, 32)) return;

        let sprite = null;
        if (textureManager && this.textureKey) {
            sprite = textureManager.getTextureByKey(this.textureKey);
        }

        if (sprite) {
            try {
                ctx.drawImage(sprite, screenPos.x - 16, screenPos.y - 16, 32, 32);
            } catch (e) {
                ctx.fillStyle = this.color;
                ctx.fillRect(screenPos.x - 16, screenPos.y - 16, 32, 32);
            }
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

    onEnter(entity) {
        if (this.slowdown) entity.speed *= this.slowdown;
        if (this.damage) entity.takeDamage(this.damage);
        if (this.deadly) entity.die();
    }

    onExit(entity) {
        if (this.slowdown) entity.speed /= this.slowdown;
    }

    containsPoint(x, y) {
        const tileX = this.x * 32;
        const tileY = this.y * 32;
        return x >= tileX - 16 && x < tileX + 16 && y >= tileY - 16 && y < tileY + 16;
    }
}



