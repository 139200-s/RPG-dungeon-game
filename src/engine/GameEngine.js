class GameEngine {
    constructor() {
        // Systems will be initialized by main.js
        this.assetLoader = null;
        this.canvas = null;
        this.input = null;
        this.world = null;
        this.camera = null;
        this.ui = null;
        this.saveManager = null;
        this.driveSync = null;
        
        // Game state
        this.player = null;
        this.particles = new Set();
        this.projectiles = new Set();
        this.effects = new Set();
        this.items = [];
        this.activeEnemies = new Set();
        this.activeBosses = new Set();
        this.defeatedBosses = new Set();
        this.openedChests = new Set();
        
        // Performance tracking
        this.lastTime = 0;
        this.deltaTime = 0;
        this.visibleChunks = new Set();
        // UI/menu state
        this.inventoryMenuOpen = false;
        this._inventoryKeyDown = false; // for toggle debounce
        this.pauseMenuOpen = false;
        this._pauseKeyDown = false;
        // Map toggle debounce
        this._mapKeyDown = false;
    }

    init() {
        // Initialize canvas and input handlers
        this.canvas.init();
        this.input.init();

        // Set up game loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(currentTime) {
        // Calculate delta time
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Update player
        this.player.update(deltaTime);

        // Update world simulation if present
        try {
            if (this.world && typeof this.world.update === 'function') this.world.update(deltaTime);
        } catch (e) {
            console.error('World update error:', e);
        }

        // Update camera to follow player
        try {
            if (this.camera && this.player) this.camera.follow(this.player);
        } catch (e) {
            console.error('Camera follow error:', e);
        }

        // Update particles
        try {
            for (const particle of this.particles) {
                particle.update(deltaTime);
                if (particle.isDone) this.particles.delete(particle);
            }
        } catch (e) { /* ignore */ }

        // Update projectiles
        try {
            for (const projectile of this.projectiles) {
                projectile.update(deltaTime);
                if (projectile.isDone) this.projectiles.delete(projectile);
            }
        } catch (e) { /* ignore */ }

        // Inventory toggle handling (Tab or configured inventory key)
        try {
            const invPressed = this.input && this.input.isActionPressed && this.input.isActionPressed('inventory');
            if (invPressed && !this._inventoryKeyDown) {
                this.inventoryMenuOpen = !this.inventoryMenuOpen;
                this._inventoryKeyDown = true;
            } else if (!invPressed) {
                this._inventoryKeyDown = false;
            }
        } catch (e) {
            // ignore input errors
        }

        // Pause toggle (Escape)
        try {
            const pausePressed = this.input && this.input.isActionPressed && this.input.isActionPressed('pause');
            if (pausePressed && !this._pauseKeyDown) {
                this.pauseMenuOpen = !this.pauseMenuOpen;
                this._pauseKeyDown = true;
            } else if (!pausePressed) {
                this._pauseKeyDown = false;
            }
        } catch (e) { }

        // Map toggle (M key) - open/close world map overlay
        try {
            const mapPressed = this.input && this.input.isActionPressed && this.input.isActionPressed('map');
            if (mapPressed && !this._mapKeyDown) {
                if (window.WorldMap && typeof window.WorldMap.toggle === 'function') {
                    window.WorldMap.toggle();
                }
                this._mapKeyDown = true;
            } else if (!mapPressed) {
                this._mapKeyDown = false;
            }
        } catch (e) { }

        // Update visible chunks based on player position
        this.updateVisibleChunks();

        // Update active entities
        this.updateEntities(deltaTime);

        // Check for section transitions
        this.checkSectionTransition();
    }

    render() {
        // Clear canvas
        this.canvas.clear();

        // If a higher-level world object exists, let it handle rendering with the camera.
        try {
            if (this.world && typeof this.world.render === 'function') {
                this.world.render(this.canvas.ctx, this.camera);
            } else {
                // Fallback: render visible chunks and entities
                this.renderChunks();
                this.renderEntities();
            }
        } catch (e) {
            console.error('Error during world/chunk render:', e);
        }

        // Render player (pass camera explicitly)
        try {
            if (this.player && typeof this.player.render === 'function') {
                // Prefer calling with (ctx, camera)
                try {
                    this.player.render(this.canvas.ctx, this.camera);
                } catch (err) {
                    // Fallback to calling with only ctx
                    try { this.player.render(this.canvas.ctx); } catch (err2) { /* swallow */ }
                }
            }
        } catch (e) {
            console.error('Player render error:', e);
        }

        // Debug overlay: show player coordinates and a center cross to verify rendering and camera centering
        try {
            const ctx = this.canvas.ctx;
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = '14px monospace';
            const px = Math.floor(this.player?.x || 0);
            const py = Math.floor(this.player?.y || 0);
            ctx.fillText(`Player: ${px}, ${py}`, 10, 20);
            // Remove debug crosshair
            // Draw player world marker (bright square) at player's world position for quick visual verification
            try {
                if (this.player && this.camera) {
                    const mark = this.camera.worldToScreen(this.player.x, this.player.y);
                    ctx.fillStyle = 'rgba(255,200,0,0.95)';
                    ctx.fillRect(mark.x - 6, mark.y - 6, 12, 12);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(mark.x - 6, mark.y - 6, 12, 12);
                }
            } catch (err) { /* ignore marker draw errors */ }

            // Remove debug input display

            ctx.restore();
        } catch (e) { /* ignore debug render errors */ }

        // Render UI on top
        try { this.renderUI(); } catch (e) { console.error('UI render error:', e); }
    }

    updateVisibleChunks() {
        if (!this.player || !this.worldGenerator) return;

        // Compute section coordinates (player.x/y are in pixels).
        const chunkSize = this.worldGenerator.CHUNK_SIZE || 16;
        const sectionSize = this.worldGenerator.SECTION_SIZE || 5;
        const pixelsPerSection = 32 * chunkSize * sectionSize;

        const sectionX = Math.floor(this.player.x / pixelsPerSection);
        const sectionY = Math.floor(this.player.y / pixelsPerSection);
        const viewDistanceSections = 2; // sections visible in each direction

        this.visibleChunks.clear();

        // Request sections around the player and collect their chunks
        for (let dx = -viewDistanceSections; dx <= viewDistanceSections; dx++) {
            for (let dy = -viewDistanceSections; dy <= viewDistanceSections; dy++) {
                try {
                    const section = this.worldGenerator.getSection(sectionX + dx, sectionY + dy);
                    if (section) {
                        for (const c of section.getChunks()) {
                            this.visibleChunks.add(c);
                        }
                    }
                } catch (e) {
                    console.error('Error getting chunks from section:', e);
                }
            }
        }
    }

    updateEntities(deltaTime) {
        // Update enemies
        for (const enemy of this.activeEnemies) {
            enemy.update(deltaTime);
            if (!enemy.isAlive()) {
                this.activeEnemies.delete(enemy);
            }
        }

        // Update bosses
        for (const boss of this.activeBosses) {
            boss.update(deltaTime);
            if (!boss.isAlive()) {
                this.activeBosses.delete(boss);
                this.saveManager.saveBossDefeated(boss.id);
            }
        }
    }

    renderChunks() {
        if (!this.camera) return; // Don't render without camera
        
        try {
            // First try to render via world generator if available
            if (this.worldGenerator && typeof this.worldGenerator.render === 'function') {
                this.worldGenerator.render(this.canvas.ctx, this.camera);
                return;
            }
            
            // Otherwise render visible chunks directly
            for (const chunk of this.visibleChunks) {
                try {
                    chunk.render(this.canvas.ctx, this.camera);
                } catch (e) {
                    // If a chunk throws during render, skip it to keep the loop alive
                    console.error('Chunk render error:', e);
                }
            }
        } catch (e) {
            console.error('renderChunks error:', e);
        }
    }

    renderEntities() {
        // Render enemies (pass camera)
        for (const enemy of this.activeEnemies) {
            try { enemy.render(this.canvas.ctx, this.camera); } catch (e) { try { enemy.render(this.canvas.ctx); } catch (err) {} }
        }

        // Render bosses (pass camera)
        for (const boss of this.activeBosses) {
            try { boss.render(this.canvas.ctx, this.camera); } catch (e) { try { boss.render(this.canvas.ctx); } catch (err) {} }
        }
    }

    // Utility: return entities (enemies + bosses) within an angular arc
    // x,y in world pixels; startAngle/endAngle are absolute angles in radians
    getEntitiesInArc(x, y, range, startAngle, endAngle) {
        const results = [];
        const checkList = [...this.activeEnemies, ...this.activeBosses];
        for (const ent of checkList) {
            if (!ent || typeof ent.x !== 'number') continue;
            const dx = ent.x - x;
            const dy = ent.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > range * 32) continue; // convert range in tiles -> pixels if caller expects tiles
            const ang = Math.atan2(dy, dx);
            // normalize difference
            let dAng = ang - startAngle;
            while (dAng > Math.PI) dAng -= Math.PI * 2;
            while (dAng < -Math.PI) dAng += Math.PI * 2;
            // Simple check: if ang is between start and end when normalized
            // We'll compute similarly for endAngle by checking clipped range
            const mid = startAngle + (endAngle - startAngle) / 2;
            const half = Math.abs(endAngle - startAngle) / 2;
            const diff = Math.abs(this._normalizeAngle(ang - mid));
            if (diff <= half) results.push(ent);
        }
        return results;
    }

    // Return nearby chunks around a world pixel coordinate (used by collision checks)
    // worldX/worldY are in pixels. radiusChunks is how many chunks out from center to include (default 1)
    getNearbyChunks(worldX, worldY, radiusChunks = 1) {
        try {
            if (!this.worldGenerator) return [];
            const tileX = Math.floor(worldX / 32);
            const tileY = Math.floor(worldY / 32);
            const chunkRadius = Math.max(1, Math.floor(radiusChunks));

            const seen = new Set();
            const results = [];

            for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
                for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
                    const cx = tileX + dx * (this.worldGenerator.CHUNK_SIZE || 1);
                    const cy = tileY + dy * (this.worldGenerator.CHUNK_SIZE || 1);
                    try {
                        const chunk = this.worldGenerator.getChunkAt(cx, cy);
                        if (chunk) {
                            const key = `${chunk.x},${chunk.y}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                results.push(chunk);
                            }
                        }
                    } catch (e) {
                        // ignore per-chunk lookup failures
                    }
                }
            }

            return results;
        } catch (e) {
            return [];
        }
    }

    _normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    renderUI() {
        // Render HUD
        HUD.render(this.canvas.ctx, this.player);

        // Render any active menus (guard if UI modules aren't loaded)
        try {
            if ((this.inventoryMenuOpen || (this.inventory && this.inventory.isOpen) || (this.player && this.player.inventory && this.player.inventory.isOpen))
                && typeof InventoryUI !== 'undefined') {
                InventoryUI.render(this.canvas.ctx, this.player.inventory);
            }
        } catch (e) {
            // If InventoryUI isn't present or throws, skip it (it may not be loaded yet)
        }

        try {
            if (this.inCombat && typeof CombatUI !== 'undefined') {
                CombatUI.render(this.canvas.ctx, this.currentCombat);
            }
        } catch (e) {
            // Skip combat UI if unavailable
        }

        // Pause menu (render above other UI)
        try {
            if (this.pauseMenuOpen && typeof PauseMenu !== 'undefined') {
                PauseMenu.render(this.canvas.ctx);
            }
        } catch (e) { /* ignore */ }
    }

    checkSectionTransition() {
        // Use tile coordinates when asking WorldGenerator for section
        const tileX = Math.floor(this.player.x / 32);
        const tileY = Math.floor(this.player.y / 32);
        const currentSection = this.worldGenerator.getSectionAt(tileX, tileY);

        if (currentSection !== this.currentSection) {
            this.currentSection = currentSection;
            this.loadSection(currentSection);
        }
    }

    loadSection(section) {
        // Clear current enemies and bosses
        this.activeEnemies.clear();
        this.activeBosses.clear();

        // Load section-specific entities
        const entities = this.worldGenerator.getEntitiesForSection(section);
        
        for (const entity of entities) {
            if (entity instanceof Boss) {
                if (!this.saveManager.isBossDefeated(entity.id)) {
                    this.activeBosses.add(entity);
                }
            } else {
                this.activeEnemies.add(entity);
            }
        }
    }

    startCombat(opponent) {
        this.inCombat = true;
        this.currentCombat = new Combat(this.player, opponent);
    }

    endCombat() {
        this.inCombat = false;
        this.currentCombat = null;
    }

    // Called when the player dies. Provide a safe default so Player.die() won't throw.
    onPlayerDeath() {
        try {
            console.warn('onPlayerDeath: player died (default handler)');
            // Pause the game and open pause/menu so user can reload or respawn
            this.pauseMenuOpen = true;
        } catch (e) { /* ignore */ }
    }

    // Called when the player levels up. Default no-op with a console message.
    onPlayerLevelUp(player) {
        try { console.log('Player leveled up to', player.level); } catch (e) { /* ignore */ }
    }
}