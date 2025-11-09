class WorldGenerator {
    constructor(gameOrSeed = Date.now(), maybeSeed) {
        // Support two constructor styles used in the project:
        // - new WorldGenerator(game, seed)
        // - new WorldGenerator(seed)
        if (typeof gameOrSeed === 'object' && gameOrSeed !== null && (gameOrSeed.camera || gameOrSeed.player || gameOrSeed.world)) {
            this.gameEngine = gameOrSeed;
            this.seed = maybeSeed || Date.now();
        } else {
            this.gameEngine = null;
            this.seed = gameOrSeed || Date.now();
        }

        this.sections = new Map();
        this.biomeGenerator = new BiomeGenerator(this.seed);
        
        // Constants
        this.SECTION_SIZE = 5; // 5x5 chunks per section
        this.CHUNK_SIZE = 16;  // 16x16 tiles per chunk for better performance
        
        this.loadedSections = new Set();
        this.visibleSections = new Set();
        
        // Initialize with center section
        const centerSection = this.getSection(0, 0);
        
        // Ensure gameEngine is set to properly handle camera dependencies
        if (typeof gameOrSeed === 'object' && gameOrSeed !== null && gameOrSeed.camera) {
            this.gameEngine = gameOrSeed;
            centerSection.gameEngine = gameOrSeed;
        }
        
        // Cache for performance
        this.loadedSections = new Set();
        this.visibleSections = new Set();
    }

    generateTestMap() {
        // Create a simple 3x3 grid of sections for testing
        for (let y = -1; y <= 1; y++) {
            for (let x = -1; x <= 1; x++) {
                this.getSection(x, y);
            }
        }
        
        // Add some test content
        const centerSection = this.getSection(0, 0);
        if (centerSection) {
            // Add a mini-boss
            const boss = new Boss('mini', centerSection);
            // Use setPosition to ensure proper coordinate conversion
            boss.setPosition(2, 2);
            centerSection.entities.add(boss);
        }
    }

    getSectionAt(x, y) {
        const sectionX = Math.floor(x / (this.SECTION_SIZE * this.CHUNK_SIZE));
        const sectionY = Math.floor(y / (this.SECTION_SIZE * this.CHUNK_SIZE));
        
        return this.getSection(sectionX, sectionY);
    }

    getSection(sectionX, sectionY) {
        const key = `${sectionX},${sectionY}`;
        
        if (!this.sections.has(key)) {
            const section = new Section(sectionX, sectionY, this);
            this.sections.set(key, section);
        }
        
        return this.sections.get(key);
    }

    getChunkAt(x, y) {
        try {
            // x,y are tile coordinates. Convert tiles -> section -> local tile -> chunk.
            const tilesPerSection = this.SECTION_SIZE * this.CHUNK_SIZE;
            const sectionX = Math.floor(x / tilesPerSection);
            const sectionY = Math.floor(y / tilesPerSection);

            const section = this.getSection(sectionX, sectionY);
            if (!section) return null;

            // Local tile coordinates within the section (0 .. tilesPerSection-1)
            let localTileX = x - sectionX * tilesPerSection;
            let localTileY = y - sectionY * tilesPerSection;

            // Clamp
            if (localTileX < 0) localTileX = 0;
            if (localTileY < 0) localTileY = 0;
            if (localTileX >= tilesPerSection) localTileX = tilesPerSection - 1;
            if (localTileY >= tilesPerSection) localTileY = tilesPerSection - 1;

            // Convert local tile -> local chunk coordinates inside the section
            const chunkLocalX = Math.floor(localTileX / this.CHUNK_SIZE);
            const chunkLocalY = Math.floor(localTileY / this.CHUNK_SIZE);

            return section.getChunk(chunkLocalX, chunkLocalY);
        } catch (e) {
            console.error('Error in getChunkAt:', e);
            return null;
        }
    }

    generateLoot() {
        // Generate random loot based on section and biome
        const loot = [];
        const random = this.seededRandom();

        // Determine loot quality and quantity
        const quality = random();
        const quantity = Math.floor(random() * 3) + 1;

        for (let i = 0; i < quantity; i++) {
            loot.push(this.generateItem(quality));
        }

        return loot;
    }

    generateItem(quality) {
        const random = this.seededRandom();
        
        // Item categories
        const categories = ['weapon', 'armor', 'potion', 'ability', 'misc'];
        const category = categories[Math.floor(random() * categories.length)];

        // Generate item based on category and quality
        return {
            type: category,
            quality: quality,
            // Additional properties based on type...
            properties: this.generateItemProperties(category, quality)
        };
    }

    generateItemProperties(type, quality) {
        const random = this.seededRandom();
        
        switch (type) {
            case 'weapon':
                return {
                    damage: Math.floor(10 + quality * 20 + random() * 10),
                    attackSpeed: 0.5 + random() * 1.5,
                    element: this.randomElement()
                };
            
            case 'armor':
                return {
                    defense: Math.floor(5 + quality * 15 + random() * 5),
                    type: this.randomArmorType(),
                    resistance: this.randomElement()
                };
            
            case 'potion':
                return {
                    effect: this.randomPotionEffect(),
                    duration: Math.floor(10 + quality * 20),
                    strength: Math.floor(1 + quality * 3)
                };
            
            case 'ability':
                return {
                    type: this.randomAbilityType(),
                    cooldown: Math.floor(10 - quality * 5),
                    power: Math.floor(10 + quality * 20)
                };
            
            case 'misc':
                return {
                    effect: this.randomMiscEffect(),
                    value: Math.floor(10 + quality * 50)
                };
        }
    }

    randomElement() {
        const elements = ['normal', 'fire', 'ice', 'poison', 'lightning'];
        return elements[Math.floor(this.seededRandom() * elements.length)];
    }

    randomArmorType() {
        const types = ['helmet', 'chestplate', 'leggings', 'boots', 'gloves'];
        return types[Math.floor(this.seededRandom() * types.length)];
    }

    randomPotionEffect() {
        const effects = ['heal', 'speed', 'strength', 'resistance', 'regeneration'];
        return effects[Math.floor(this.seededRandom() * effects.length)];
    }

    randomAbilityType() {
        const types = ['dash', 'blast', 'shield', 'summon', 'teleport'];
        return types[Math.floor(this.seededRandom() * types.length)];
    }

    randomMiscEffect() {
        const effects = ['luck', 'vision', 'stealth', 'mining', 'trading'];
        return effects[Math.floor(this.seededRandom() * effects.length)];
    }

    seededRandom(salt = '') {
        const str = this.seed.toString() + salt;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        // LCG using values from Numerical Recipes
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);
        
        let current = hash;
        
        return function() {
            current = (a * current + c) % m;
            return current / m;
        };
    }

    update(playerX, playerY) {
        // Update visible sections based on player position
        this.updateVisibleSections(playerX, playerY);
        
        // Update all visible sections
        for (const section of this.visibleSections) {
            section.update();
        }
        
        // Clean up far sections
        this.cleanupFarSections(playerX, playerY);
    }

    updateVisibleSections(playerX, playerY) {
        const viewDistance = 3; // Keep 3 sections visible in each direction
        const loadDistance = 4; // But load one more section ahead for smoother transitions
        
        // Clear old visible sections
        this.visibleSections.clear();
        
        // Calculate center section coordinates
        const centerSectionX = Math.floor(playerX / (this.SECTION_SIZE * this.CHUNK_SIZE));
        const centerSectionY = Math.floor(playerY / (this.SECTION_SIZE * this.CHUNK_SIZE));
        
        // Get player's movement direction for predictive loading
        let movementVector = { dx: 0, dy: 0 };
        try {
            if (this.gameEngine && this.gameEngine.input && typeof this.gameEngine.input.getMovementVector === 'function') {
                movementVector = this.gameEngine.input.getMovementVector();
            } else if (this.gameEngine && this.gameEngine.player && typeof this.gameEngine.player.getMovementVector === 'function') {
                movementVector = this.gameEngine.player.getMovementVector();
            }
        } catch (e) { movementVector = { dx: 0, dy: 0 }; }
        
        // Adjust load distance based on movement
        const loadAheadX = Math.sign(movementVector.dx);
        const loadAheadY = Math.sign(movementVector.dy);
        
        // Load and mark sections as visible
        for (let dx = -loadDistance; dx <= loadDistance; dx++) {
            for (let dy = -loadDistance; dy <= loadDistance; dy++) {
                // Get or create section
                const section = this.getSection(centerSectionX + dx, centerSectionY + dy);
                
                // Add to visible set if within view distance or in movement direction
                if (Math.abs(dx) <= viewDistance && Math.abs(dy) <= viewDistance ||
                    (Math.abs(dx + loadAheadX) <= viewDistance && Math.abs(dy + loadAheadY) <= viewDistance)) {
                    this.visibleSections.add(section);
                    
                    // Ensure section is generated
                    if (!section.isGenerated) {
                        section.generate();
                    }
                }
            }
        }
    }

    cleanupFarSections(playerX, playerY) {
        const maxDistance = 8; // Increased buffer for smoother gameplay
        const saveDistance = 6; // Distance within which sections are preserved
        
        const centerSectionX = Math.floor(playerX / (this.SECTION_SIZE * this.CHUNK_SIZE));
        const centerSectionY = Math.floor(playerY / (this.SECTION_SIZE * this.CHUNK_SIZE));
        
        // Get player's movement direction for predictive cleanup
        let movementVector = { dx: 0, dy: 0 };
        try {
            if (this.gameEngine && this.gameEngine.input && typeof this.gameEngine.input.getMovementVector === 'function') {
                movementVector = this.gameEngine.input.getMovementVector();
            } else if (this.gameEngine && this.gameEngine.player && typeof this.gameEngine.player.getMovementVector === 'function') {
                movementVector = this.gameEngine.player.getMovementVector();
            }
        } catch (e) { movementVector = { dx: 0, dy: 0 }; }
        
        // Adjust save distance based on movement direction
        const saveDirX = Math.sign(movementVector.dx);
        const saveDirY = Math.sign(movementVector.dy);
        
        for (const [key, section] of this.sections.entries()) {
            const dx = section.x - centerSectionX;
            const dy = section.y - centerSectionY;
            
            // Calculate distance considering movement direction
            const adjustedDistance = Math.max(
                Math.abs(dx - saveDirX),
                Math.abs(dy - saveDirY)
            );
            
            // Keep sections within save distance or if they're recently generated
            const keepSection = adjustedDistance <= saveDistance ||
                              (Math.abs(dx) <= maxDistance && Math.abs(dy) <= maxDistance);
            
            if (!keepSection) {
                // Save section data if needed before cleanup
                if (section.isGenerated && section.isDirty) {
                    // Could add section saving logic here
                }
                this.sections.delete(key);
            }
        }
    }

    render(ctx, camera) {
        // Render all visible sections
        for (const section of this.visibleSections) {
            // Pass camera down so sections/chunks don't have to reach into worldGenerator for it
            section.render(ctx, camera);
        }
    }

    // Return entities for a given section object or section coordinates
    getEntitiesForSection(sectionOrX, maybeY) {
        // If passed an actual Section object
        if (sectionOrX && typeof sectionOrX.getEntities === 'function') {
            return sectionOrX.getEntities();
        }

        // If passed x,y coordinates (tile or section coords), resolve section
        if (typeof sectionOrX === 'number' && typeof maybeY === 'number') {
            const section = this.getSection(sectionOrX, maybeY);
            return section ? section.getEntities() : [];
        }

        return [];
    }
}