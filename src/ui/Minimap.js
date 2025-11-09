class Minimap {
    constructor(game) {
        this.game = game;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize size based on screen dimensions
        const gameCanvas = document.getElementById('gameCanvas');
        this.size = gameCanvas ? Math.min(gameCanvas.width, gameCanvas.height) * 0.15 : 200;
        this.scale = 2;  // Pixels per tile on minimap
        
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        // Responsive resize handler
        this.resizeHandler = () => this.handleResize();
        window.addEventListener('resize', this.resizeHandler);
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleResize());
        document.addEventListener('webkitfullscreenchange', () => this.handleResize());
        document.addEventListener('mozfullscreenchange', () => this.handleResize());
        document.addEventListener('MSFullscreenChange', () => this.handleResize());
        
        // Game constants
        this.TILE_SIZE = 32;
        this.CHUNK_SIZE = 16;
        this.SECTION_SIZE = 5;
        
        // Colors for different tile types
        this.colors = {
            floor: '#3c3c3c',
            wall: '#6e6e6eff',
            water: '#235a7c',
            lava: '#7c2323',
            door: '#4a3c2d',
            chest: '#7c6a23',
            enemy: '#7c2323',
            boss: '#7c0000',
            player: '#ffffff',
            unexplored: '#1a1a1aff'
        };

        // Biome colors (used when chunk.type is not present)
        this.biomeColors = {
            NarrowTunnels: '#495057',
            OpenCaverns: '#6aa67a',
            CrystalDepths: '#5aaad6',
            MushroomCaverns: '#9a66b3',
            AbyssChasm: '#2b2b3a',
            ForgottenRuins: '#78776b',
            LavaHollows: '#883322'
        };

        // Initialize fog of war
        this.fogOfWar = new Set();
        this.exploredAreas = new Set();
    }

    update() {
        this.updateFogOfWar();
        this.render();
    }

    updateFogOfWar() {
        // Convert player world coordinates to chunk coordinates
        const tileSize = this.TILE_SIZE;
        const chunkSize = this.CHUNK_SIZE;
        
        // Get current chunk coordinates
        const playerChunkX = Math.floor(this.game.player.x / (tileSize * chunkSize));
        const playerChunkY = Math.floor(this.game.player.y / (tileSize * chunkSize));
        
    // Try to get the current chunk. Convert chunk coords -> tile coords when calling getChunkAt
    const playerChunk = this.game.worldGenerator.getChunkAt(playerChunkX * chunkSize, playerChunkY * chunkSize);
        if (!playerChunk) return;

        // Mark current area as explored
        const viewDistance = 2; // Chunks visible in each direction
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dy = -viewDistance; dy <= viewDistance; dy++) {
                const chunkX = playerChunkX + dx;
                const chunkY = playerChunkY + dy;
                const chunk = this.game.worldGenerator.getChunkAt(chunkX * chunkSize, chunkY * chunkSize);
                if (chunk && chunk.section && chunk.section.isGenerated) {
                    this.exploredAreas.add(`${chunkX},${chunkY}`);
                }
            }
        }

        // Update currently visible areas
        this.fogOfWar.clear();
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dy = -viewDistance; dy <= viewDistance; dy++) {
                const chunkX = playerChunkX + dx;
                const chunkY = playerChunkY + dy;
                const chunk = this.game.worldGenerator.getChunkAt(chunkX * chunkSize, chunkY * chunkSize);
                if (chunk && chunk.section && chunk.section.isGenerated) {
                    this.fogOfWar.add(`${chunkX},${chunkY}`);
                }
            }
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.size, this.size);

        // Calculate current player position in different coordinate systems
        const playerTileX = Math.floor(this.game.player.x / this.TILE_SIZE);
        const playerTileY = Math.floor(this.game.player.y / this.TILE_SIZE);
        const playerChunkX = Math.floor(playerTileX / this.CHUNK_SIZE);
        const playerChunkY = Math.floor(playerTileY / this.CHUNK_SIZE);
        
        // View distance in chunks
        const viewDistance = 3;
        
        // Draw all chunks in view distance
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dy = -viewDistance; dy <= viewDistance; dy++) {
                const chunkX = playerChunkX + dx;
                const chunkY = playerChunkY + dy;
                const coordStr = `${chunkX},${chunkY}`;
                
                // Determine if chunk is explored and visible
                const isExplored = this.exploredAreas.has(coordStr);
                const isVisible = this.fogOfWar.has(coordStr);
                
                if (isExplored) {
                    this.renderChunk(chunkX, chunkY, !isVisible);
                }
            }
        }

        // Draw entities
        this.renderEntities();

        // Draw player
        this.ctx.fillStyle = this.colors.player;
        this.ctx.beginPath();
        this.ctx.arc(this.size / 2, this.size / 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw direction indicator
        const playerAngle = this.game.player.direction || 0;
        const indicatorLength = 8;
        this.ctx.strokeStyle = this.colors.player;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.size / 2, this.size / 2);
        this.ctx.lineTo(
            this.size / 2 + Math.cos(playerAngle) * indicatorLength,
            this.size / 2 + Math.sin(playerAngle) * indicatorLength
        );
        this.ctx.stroke();

        // Draw border
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.size, this.size);

        // Draw coordinates and biome information
        if (this.game && this.game.player) {
            // Calculate tile coordinates
            const tileSize = 32;
            const chunkSize = 16;
            const sectionSize = 5;
            
            // Get player position in different coordinate systems
            const tileX = Math.floor(this.game.player.x / tileSize);
            const tileY = Math.floor(this.game.player.y / tileSize);
            const chunkX = Math.floor(tileX / chunkSize);
            const chunkY = Math.floor(tileY / chunkSize);
            const sectionX = Math.floor(chunkX / sectionSize);
            const sectionY = Math.floor(chunkY / sectionSize);
            
            // Get current chunk and its section (convert chunk coords -> tile coords)
            const playerChunk = this.game.worldGenerator.getChunkAt(chunkX * chunkSize, chunkY * chunkSize);
            
            // Get biome information
            let biomeName = 'Unknown';
            if (playerChunk && playerChunk.section) {
                try {
                    biomeName = playerChunk.section.getBiome();
                } catch (e) {
                    console.warn('Failed to get biome:', e);
                }
            }
            
            // Draw position information
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            
            // Draw tile coordinates
            this.ctx.fillText(`Tile: ${tileX}, ${tileY}`, this.size / 2, this.size - 36);
            
            // Draw chunk coordinates
            this.ctx.fillText(`Chunk: ${chunkX}, ${chunkY}`, this.size / 2, this.size - 22);
            
            // Draw biome name
            this.ctx.fillStyle = this.biomeColors[biomeName] || '#fff';
            this.ctx.fillText(`Biome: ${biomeName}`, this.size / 2, this.size - 8);
        }
    }

    renderChunk(chunkX, chunkY, isDimmed) {
        const tileSize = this.TILE_SIZE;
        const chunkSize = this.CHUNK_SIZE;
        const pixelSize = tileSize * chunkSize;
        
        // Get the chunk at these coordinates
    const chunk = this.game.worldGenerator.getChunkAt(chunkX * chunkSize, chunkY * chunkSize);
        if (!chunk || !chunk.section) return;

        const centerX = this.size / 2;
        const centerY = this.size / 2;
        
        // Calculate world coordinates for chunk center (in pixels)
        const worldX = (chunkX * chunkSize + chunkSize / 2) * tileSize;
        const worldY = (chunkY * chunkSize + chunkSize / 2) * tileSize;

        // Map world position to minimap coordinates
        const pos = this.worldToMinimap(worldX, worldY);

        // Determine color: prefer chunk.type, fallback to biome color or default
        let baseColor = this.colors.floor;
        try {
            if (chunk.type && this.colors[chunk.type]) {
                baseColor = this.colors[chunk.type];
            } else if (chunk.section && typeof chunk.section.getBiome === 'function') {
                const biomeName = chunk.section.getBiome();
                baseColor = this.biomeColors[biomeName] || this.colors.floor;
            }
        } catch (err) { /* ignore */ }

        // Calculate chunk size on minimap
        const chunkScreenSize = (chunk.SIZE * this.TILE_SIZE) * this.scale;
        
        // Apply color with dimming if needed
        this.ctx.fillStyle = isDimmed ? this.adjustColor(baseColor, -50) : baseColor;
        
        // Draw chunk relative to player position
        this.ctx.fillRect(
            pos.x - chunkScreenSize/2,
            pos.y - chunkScreenSize/2,
            chunkScreenSize,
            chunkScreenSize
        );
    }

    renderEntities() {
        // Draw enemies
        this.game.activeEnemies.forEach(enemy => {
            const pos = this.worldToMinimap(enemy.x, enemy.y);
            this.ctx.fillStyle = this.colors.enemy;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw bosses
        this.game.activeBosses.forEach(boss => {
            const pos = this.worldToMinimap(boss.x, boss.y);
            this.ctx.fillStyle = this.colors.boss;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    worldToMinimap(worldX, worldY) {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const tileSize = 32;
        
        // Calculate relative position to player in world coordinates
        const relativeX = worldX - this.game.player.x;
        const relativeY = worldY - this.game.player.y;

        // Convert to minimap coordinates
        return {
            x: centerX + (relativeX / tileSize) * this.scale,
            y: centerY + (relativeY / tileSize) * this.scale
        };
    }

    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Handle fullscreen changes
    handleResize() {
        // Get the main canvas
        const gameCanvas = document.getElementById('gameCanvas');
        if (!gameCanvas) return;
        
        // Calculate new size based on canvas dimensions
        const isFullscreen = document.fullscreenElement !== null;
        const baseSize = Math.min(gameCanvas.width, gameCanvas.height);
        
        // Adjust size based on screen mode
        this.size = isFullscreen ? baseSize * 0.15 : Math.min(200, baseSize * 0.2);
        
        // Update canvas dimensions
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        // Adjust scale based on new size
        this.scale = Math.max(1, this.size / 100);
        
        // Force immediate update
        this.update();
    }
    
    // Handle showing/hiding expanded map view
    toggleFullMap() {
        if (this.isFullMap) {
            this.size = document.fullscreenElement ? Math.min(window.innerWidth, window.innerHeight) * 0.15 : 200;
            this.scale = this.size / 100;
        } else {
            this.size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
            this.scale = this.size / 50;
        }
        this.isFullMap = !this.isFullMap;
        
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.render();
    }
}