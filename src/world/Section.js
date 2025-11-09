class Section {
    constructor(x, y, worldGenerator) {
        this.x = x;
        this.y = y;
        this.worldGenerator = worldGenerator;
        // Expose a direct reference to the game engine for convenience
        this.gameEngine = worldGenerator?.gameEngine || null;
        // Also ensure camera is available
        this.camera = this.gameEngine?.camera || null;
        this.chunks = new Map();
        this.biome = null;
        this.isGenerated = false; // Track if this section has been generated
        this.entities = new Set();
        this.chests = new Set();
        
        // Constants
        this.SIZE = 5; // 5x5 chunks
        this.CHEST_COUNT = 2; // Base number of chests
        
        this.generate();
    }

    generate() {
        if (this.isGenerated) return;
        
        // Determine biome based on position and seed
        this.biome = this.determineBiome();

        // Generate chunks with proper coordinate mapping
        const sectionPixelX = this.x * this.SIZE * 16 * 32; // section * chunks/section * tiles/chunk * pixels/tile
        const sectionPixelY = this.y * this.SIZE * 16 * 32;
        
        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const chunk = new Chunk(
                    this.x * this.SIZE + x,  // Global chunk coordinates
                    this.y * this.SIZE + y,
                    this
                );
                chunk.pixelX = sectionPixelX + x * 16 * 32; // Store absolute pixel positions
                chunk.pixelY = sectionPixelY + y * 16 * 32;
                this.chunks.set(`${x},${y}`, chunk);
            }
        }

        // Generate special features
        this.generateFeatures();
        
        this.isGenerated = true;
    }

    determineBiome() {
        const x = this.x;
        const y = this.y;
        
        // Use multiple noise layers for more varied biome distribution
        const baseNoise = this.worldGenerator.biomeGenerator.getNoise(x, y, 0.03);
        const tempNoise = this.worldGenerator.biomeGenerator.getNoise(x + 1000, y + 1000, 0.02);
        const moistureNoise = this.worldGenerator.biomeGenerator.getNoise(x - 1000, y - 1000, 0.02);
        
        // Combine noise values for biome selection
        const combined = baseNoise + tempNoise * 0.5 + moistureNoise * 0.5;
        
        // Biome types based on combined noise value for smooth transitions
        if (combined < -0.6) return 'NarrowTunnels';
        if (combined < -0.3) return 'OpenCaverns';
        if (combined < 0.0) return 'CrystalDepths';
        if (combined < 0.2) return 'MushroomCaverns';
        if (combined < 0.4) return 'AbyssChasm';
        if (combined < 0.6) return 'ForgottenRuins';
        return 'LavaHollows';
    }

    generateFeatures() {
        // Always generate 2 base chests per section
        this.generateChests(2);

        // Use section coordinates and seed for deterministic boss placement
        const sectionHash = this.x * 31 + this.y;
        const random = this.worldGenerator.seededRandom(sectionHash);
        const roll = random();

        // 1/9 sections: normal boss (2×2, 3×3, or 4×4) + 5 extra chests
        if (roll < 0.11) { // 1/9 chance
            const bossType = this.determineBossType(); // small/medium/large
            this.generateBoss(bossType);
            // Add 5 extra chests for normal boss sections
            this.generateChests(5);
        }
        // 1/4 sections (but not if we already have a normal boss): mini-boss (2×2) + 2 extra chests
        else if (roll < 0.36) { // (0.36 - 0.11 = 0.25 = 1/4)
            this.generateBoss('mini');
            // Add 2 extra chests for mini-boss sections
            this.generateChests(2);
        }
    }

    shouldHaveBoss() {
        // Use section coordinates and seed for deterministic boss placement
        const sectionHash = this.x * 31 + this.y;
        const random = this.worldGenerator.seededRandom(sectionHash);
        const roll = random();

        // 1/9 chance for normal boss, 1/4 chance for mini-boss
        if (roll < 0.11) return 'normal';
        if (roll < 0.36) return 'mini';
        return false;
    }

    determineBossType() {
        const random = this.worldGenerator.seededRandom(this.x * 73 + this.y);
        const roll = random();

        // For normal bosses, determine size
        if (roll < 0.4) return 'small';  // 2x2
        if (roll < 0.8) return 'medium'; // 3x3
        return 'large';                  // 4x4
    }

    generateBoss(type) {
        // Create boss instance based on type
        const boss = new Boss(type, this);
        
        // Find suitable location for boss (in grid coordinates)
        const position = this.findBossLocation(boss.size);
        // position is already in grid coordinates, so we can use it directly
        boss.setPosition(position.x, position.y);

        // Add boss to section
        this.entities.add(boss);
    }

    generateChests(count) {
        for (let i = 0; i < count; i++) {
            const position = this.findChestLocation();
            // Create chest at the position with loot
            const chest = new Chest(
                Math.floor(position.x),  // Ensure integer position
                Math.floor(position.y),  // Ensure integer position
                this.worldGenerator.generateLoot()
            );
            this.chests.add(chest);
        }
    }

    findBossLocation(size) {
        // Find open area large enough for boss
        // Return grid coordinates (will be converted to pixels by Boss.setPosition)
        const centerX = this.x * this.SIZE + Math.floor(this.SIZE / 2);
        const centerY = this.y * this.SIZE + Math.floor(this.SIZE / 2);
        
        return { x: centerX, y: centerY };
    }

    findChestLocation() {
        // Find suitable location for chest placement
        // Avoid placing too close to other chests or bosses
        const random = this.worldGenerator.seededRandom(
            this.x * 127 + this.y + this.chests.size
        );

        const x = this.x * this.SIZE + random() * this.SIZE;
        const y = this.y * this.SIZE + random() * this.SIZE;

        return { x, y };
    }

    getChunk(localX, localY) {
        try {
            if (localX >= 0 && localX < this.SIZE && localY >= 0 && localY < this.SIZE) {
                return this.chunks.get(`${localX},${localY}`);
            }
            return null;
        } catch (e) {
            console.error('Error in getChunk:', e);
            return null;
        }
    }

    getChunks() {
        return Array.from(this.chunks.values());
    }

    // Return all chunks that overlap a rectangle. Accepts coordinates in pixels or tiles.
    // Parameters: x, y (top-left), width, height. If values look large (>32) they'll be treated as pixels and converted to tile coords.
    getChunksInRect(x, y, width, height) {
        // Normalize inputs: determine whether values are pixels (large) or tiles (small)
        const isPixels = Math.abs(x) > 64 || Math.abs(y) > 64 || width > 64 || height > 64;

        let startTileX, startTileY, endTileX, endTileY;
        if (isPixels) {
            startTileX = Math.floor(x / 32);
            startTileY = Math.floor(y / 32);
            endTileX = Math.floor((x + width) / 32);
            endTileY = Math.floor((y + height) / 32);
        } else {
            startTileX = Math.floor(x);
            startTileY = Math.floor(y);
            endTileX = Math.floor(x + width);
            endTileY = Math.floor(y + height);
        }

        const results = [];
        for (const chunk of this.chunks.values()) {
            // Each chunk covers chunk.SIZE tiles starting at chunk.x * chunk.SIZE
            const chunkTileX = chunk.x * (chunk.SIZE || 1);
            const chunkTileY = chunk.y * (chunk.SIZE || 1);
            const chunkEndX = chunkTileX + (chunk.SIZE || 1) - 1;
            const chunkEndY = chunkTileY + (chunk.SIZE || 1) - 1;

            // Check overlap between [startTileX..endTileX] and [chunkTileX..chunkEndX]
            if (chunkEndX < startTileX || chunkTileX > endTileX) continue;
            if (chunkEndY < startTileY || chunkTileY > endTileY) continue;

            results.push(chunk);
        }

        return results;
    }

    getEntities() {
        return Array.from(this.entities);
    }

    getChests() {
        return Array.from(this.chests);
    }

    getBiome() {
        return this.biome;
    }

    // Check if a world coordinate is within this section
    containsPoint(x, y) {
        const sectionX = this.x * this.SIZE;
        const sectionY = this.y * this.SIZE;
        
        return x >= sectionX && x < sectionX + this.SIZE &&
               y >= sectionY && y < sectionY + this.SIZE;
    }

    update(deltaTime) {
        // Update all entities in the section
        for (const entity of this.entities) {
            entity.update(deltaTime);
        }
    }

    // Remove a boss from this section and inform the engine if available
    removeBoss(boss) {
        if (!boss) return false;
        if (this.entities && this.entities.has(boss)) {
            this.entities.delete(boss);
        }
        const engine = this.gameEngine || (this.worldGenerator && this.worldGenerator.gameEngine) || (window.game);
        try {
            if (engine && engine.activeBosses && engine.activeBosses.has(boss)) {
                engine.activeBosses.delete(boss);
            }
        } catch (e) { /* ignore */ }
        return true;
    }

    // Add a dropped item to the game world; fallback to engine-level items list when needed
    addItem(item, x, y) {
        const engine = this.gameEngine || (this.worldGenerator && this.worldGenerator.gameEngine) || (window.game);
        if (engine && Array.isArray(engine.items)) {
            engine.items.push({ item, x, y, section: this });
            return true;
        }
        return false;
    }

    render(ctx, camera) {
        // Render all chunks
        for (const chunk of this.chunks.values()) {
            chunk.render(ctx, camera);
        }

        // Render all entities
        for (const entity of this.entities) {
            // If entity.render accepts a camera, pass it through; otherwise call normally
            try {
                if (entity && typeof entity.render === 'function') {
                    // Prefer signature (ctx, camera) when available
                    entity.render(ctx, camera);
                }
            } catch (e) {
                // Fallback: try without camera
                try { entity.render(ctx); } catch (err) { /* ignore render errors */ }
            }
        }

        // Render all chests
        for (const chest of this.chests) {
            try {
                chest.render(ctx, camera);
            } catch (e) {
                try { chest.render(ctx); } catch (err) { /* ignore */ }
            }
        }
    }
}