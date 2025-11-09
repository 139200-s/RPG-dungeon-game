class Chunk {
    constructor(x, y, section) {
        this.x = x;
        this.y = y;
        this.section = section;
        this.tiles = [];
        this.objects = new Set();
        this.entities = new Set();
        
        // Size in tiles
        this.SIZE = 16;
        
        // Store absolute pixel coordinates for this chunk
        this.pixelX = x * this.SIZE * 32;
        this.pixelY = y * this.SIZE * 32;
        
        this.generate();
    }

    generate() {
        // Initialize tiles array
        this.tiles = [];
        for (let y = 0; y < this.SIZE; y++) {
            this.tiles[y] = new Array(this.SIZE).fill(null);
        }

        // Generate based on biome
        const biome = this.section.getBiome();
        this.generateTerrain(biome);
    }

    generateTerrain(biome) {
        // Get noise values for this chunk's position
        const baseNoise = this.section.worldGenerator.biomeGenerator.getNoise(
            this.x * this.SIZE,
            this.y * this.SIZE,
            0.1
        );

        // Generate tiles based on biome rules
        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const worldX = this.x * this.SIZE + x;
                const worldY = this.y * this.SIZE + y;
                
                const noise = this.section.worldGenerator.biomeGenerator.getNoise(worldX, worldY, 0.2);
                const tileType = this.section.worldGenerator.biomeGenerator.getBiomeAt(worldX, worldY).getTileType(noise, baseNoise);
                const tile = new Tile(tileType, worldX, worldY);
                
                this.setTile(x, y, tile);
            }
        }
    }

    setTile(x, y, tile) {
        if (x >= 0 && x < this.SIZE && y >= 0 && y < this.SIZE && this.tiles[y]) {
            this.tiles[y][x] = tile;
        }
    }

    getTile(x, y) {
        if (x >= 0 && x < this.SIZE && y >= 0 && y < this.SIZE && this.tiles[y]) {
            return this.tiles[y][x];
        }
        return null;
    }

    addObject(object) {
        this.objects.add(object);
    }

    removeObject(object) {
        this.objects.delete(object);
    }

    addEntity(entity) {
        this.entities.add(entity);
    }

    removeEntity(entity) {
        this.entities.delete(entity);
    }

    render(ctx, camera) {
        // First try passed camera, then section camera, then worldGenerator camera
        const renderCamera = camera || 
                           this.section?.camera || 
                           (this.section?.worldGenerator?.gameEngine?.camera);
        
        if (!renderCamera || !renderCamera.worldToScreen) {
            // No valid camera available — skip rendering to avoid exceptions
            return;
        }

        // Calculate screen position
        const screenPos = renderCamera.worldToScreen(
            this.x * this.SIZE * 32, // Convert to pixel coordinates
            this.y * this.SIZE * 32
        );

        // Only render if chunk is on screen
        if (!camera.isOnScreen(screenPos.x, screenPos.y, this.SIZE * 32)) {
            return;
        }

        // Render tiles
        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const tile = this.getTile(x, y);
                if (tile) {
                    const worldX = this.x * this.SIZE + x;
                    const worldY = this.y * this.SIZE + y;
                    // Pass camera through to tile render if it expects it
                    if (typeof tile.render === 'function') tile.render(ctx, camera, worldX, worldY);
                }
            }
        }

        // Render objects
        for (const object of this.objects) {
            object.render(ctx);
        }
    }

    // Check if a point is within this chunk
    containsPoint(x, y) {
        const chunkX = this.x * this.SIZE;
        const chunkY = this.y * this.SIZE;
        
        return x >= chunkX && x < chunkX + this.SIZE &&
               y >= chunkY && y < chunkY + this.SIZE;
    }

    // Get all entities in this chunk
    getEntities() {
        return Array.from(this.entities);
    }

    // Get all collidable objects in this chunk
    getCollidables() {
        return [...this.objects].filter(obj => obj.collidable);
    }

    // Check if a world coordinate (pixels) has collision in this chunk.
    // Accepts worldX/worldY in pixels. Returns true if any tile or object at that point is collidable.
    hasCollisionAt(worldX, worldY) {
        try {
            const tileSize = 32;
            // Convert to tile coords
            const tileX = Math.floor(worldX / tileSize);
            const tileY = Math.floor(worldY / tileSize);

            // Local tile indices within this chunk
            const localX = tileX - (this.x * (this.SIZE || 1));
            const localY = tileY - (this.y * (this.SIZE || 1));

            // Check tile collision
            if (localX >= 0 && localX < (this.SIZE || 1) && localY >= 0 && localY < (this.SIZE || 1)) {
                const tile = this.getTile(localX, localY);
                if (tile && tile.collidable) return true;
            }

            // Check collidable objects in this chunk (objects use world pixel coords)
            for (const obj of this.objects) {
                try {
                    if (obj && obj.collidable) {
                        if (typeof obj.containsPoint === 'function') {
                            if (obj.containsPoint(worldX, worldY)) return true;
                        } else if (typeof obj.x === 'number' && typeof obj.y === 'number') {
                            // Fallback: simple bounding box check if size available
                            const w = obj.width || 32;
                            const h = obj.height || 32;
                            if (worldX >= obj.x && worldX < obj.x + w && worldY >= obj.y && worldY < obj.y + h) return true;
                        }
                    }
                } catch (e) { /* ignore object check errors */ }
            }

            return false;
        } catch (e) {
            return false;
        }
    }
}