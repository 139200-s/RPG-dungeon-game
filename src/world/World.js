class World {
    // Constructor supports two modes:
    // - finite world: new World(width, height, section)
    // - generator-backed infinite world: new World(worldGenerator)
    constructor(a, b, c) {
        this.entities = [];
        this.items = [];
        this.interactables = [];
        this.rooms = [];

        // If a WorldGenerator is provided, operate in infinite/procedural mode
        if (a && typeof a.update === 'function' && typeof a.getSection === 'function') {
            this.worldGenerator = a;
            this.isInfinite = true;
            // keep a small cache of visible sections
            this._visibleSections = new Set();
            return;
        }

        // Fallback: finite world mode (legacy)
        const width = a || 50;
        const height = b || 50;
        this.width = width;
        this.height = height;
        this.section = c || null;

        // Create noise generator with fixed seed for testing
        this.noise = new SimplexNoise('test-seed');

        // Initialize empty world with fixed dimensions
        this.tiles = Array(height).fill().map(() => Array(width).fill(null));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.tiles[y][x] = new Tile('wall', x, y);
            }
        }

        // The following block is redundant and overrides the above initialization.
        // Remove or comment out one of these blocks to avoid confusion.
        /*
        // Create noise generator with fixed seed for testing
        this.noise = new SimplexNoise('test-seed');

        // Initialize empty world
        this.tiles = Array(height).fill().map(() => Array(width).fill(null));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const value = (this.noise.noise2D(x * 0.1, y * 0.1) + 1) / 2;
                const type = value > 0.5 ? 'wall' : 'floor';
                this.tiles[y][x] = new Tile(type, x, y);
            }
        }
        */
    }

    generate() {
        if (this.isInfinite && this.worldGenerator) {
            // In procedural mode we delegate generation to the generator
            // Ensure the central section exists
            this.worldGenerator.getSection(0, 0);
            // Return a default spawn pos (0,0) in pixels if engine expects it
            return { x: 0, y: 0 };
        }

        // Reset world (finite mode)
        this.entities = [];
        this.items = [];
        this.interactables = [];

        // Generate rooms using BSP (Binary Space Partitioning)
        const rooms = this.generateRooms();
        // Store rooms for later use
        this.rooms = rooms;

        // Connect rooms with corridors
        this.connectRooms(rooms);

        // Place doors between rooms
        this.placeDoors(rooms);

        // Add decorative elements
        this.addDecorations();

        // Place enemies
        this.placeEnemies();

        // Place items and treasure
        this.placeItems();

        // Place boss room
        this.placeBossRoom();

        // Return player starting position (center of first room)
        const startRoom = rooms[0];
        return {
            x: (startRoom.x + startRoom.width / 2) * 32,
            y: (startRoom.y + startRoom.height / 2) * 32
        };
    }

    generateRooms() {
        const rooms = [];
        const minRoomSize = 5;
        const maxRoomSize = 12;

        // Start with the whole map as one space
        const spaces = [{
            x: 1,
            y: 1,
            width: this.width - 2,
            height: this.height - 2
        }];

        // Split spaces recursively
        while (spaces.length > 0) {
            const space = spaces.pop();

            // If space is too small, make it a room
            if (space.width <= maxRoomSize && space.height <= maxRoomSize) {
                if (space.width >= minRoomSize && space.height >= minRoomSize) {
                    rooms.push(space);
                }
                continue;
            }

            // Split space either horizontally or vertically
            const splitHorizontally = space.width < space.height;
            const splitPos = Math.random() * 0.4 + 0.3; // Split between 30-70%

            if (splitHorizontally) {
                const splitY = Math.floor(space.y + space.height * splitPos);
                spaces.push({
                    x: space.x,
                    y: space.y,
                    width: space.width,
                    height: splitY - space.y
                });
                spaces.push({
                    x: space.x,
                    y: splitY,
                    width: space.width,
                    height: space.height - (splitY - space.y)
                });
            } else {
                const splitX = Math.floor(space.x + space.width * splitPos);
                spaces.push({
                    x: space.x,
                    y: space.y,
                    width: splitX - space.x,
                    height: space.height
                });
                spaces.push({
                    x: splitX,
                    y: space.y,
                    width: space.width - (splitX - space.x),
                    height: space.height
                });
            }
        }

        // Carve out rooms
        rooms.forEach(room => {
            for (let y = room.y; y < room.y + room.height; y++) {
                if (y >= 0 && y < this.height) {
                    if (!this.tiles[y]) this.tiles[y] = [];
                    for (let x = room.x; x < room.x + room.width; x++) {
                        if (x >= 0 && x < this.width) {
                            this.tiles[y][x] = new Tile('floor', x, y);
                        }
                    }
                }
            }
        });

        return rooms;
    }

    connectRooms(rooms) {
        // Create a graph of rooms
        const edges = [];

        // Connect each room to its nearest neighbor
        rooms.forEach((room1, i) => {
            rooms.slice(i + 1).forEach(room2 => {
                const center1 = {
                    x: room1.x + room1.width / 2,
                    y: room1.y + room1.height / 2
                };
                const center2 = {
                    x: room2.x + room2.width / 2,
                    y: room2.y + room2.height / 2
                };
                const distance = Math.sqrt(
                    Math.pow(center2.x - center1.x, 2) +
                    Math.pow(center2.y - center1.y, 2)
                );
                edges.push({
                    room1: room1,
                    room2: room2,
                    distance: distance
                });
            });
        });

        // Sort edges by distance
        edges.sort((a, b) => a.distance - b.distance);

        // Create minimum spanning tree using Kruskal's algorithm
        const sets = new DisjointSet(rooms);
        const corridors = [];

        edges.forEach(edge => {
            if (sets.find(edge.room1) !== sets.find(edge.room2)) {
                sets.union(edge.room1, edge.room2);
                corridors.push(edge);
            }
        });

        // Add a few extra corridors for loops
        edges.forEach(edge => {
            if (Math.random() < 0.2) { // 20% chance to add extra corridor
                corridors.push(edge);
            }
        });

        // Carve corridors
        corridors.forEach(corridor => {
            const start = {
                x: Math.floor(corridor.room1.x + corridor.room1.width / 2),
                y: Math.floor(corridor.room1.y + corridor.room1.height / 2)
            };
            const end = {
                x: Math.floor(corridor.room2.x + corridor.room2.width / 2),
                y: Math.floor(corridor.room2.y + corridor.room2.height / 2)
            };

            // L-shaped corridor
            let x = start.x;
            let y = start.y;

            while (x !== end.x) {
                x += Math.sign(end.x - x);
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    this.tiles[y][x] = new Tile('floor', x, y);
                }
            }
            while (y !== end.y) {
                y += Math.sign(end.y - y);
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    this.tiles[y][x] = new Tile('floor', x, y);
                }
            }
        });
    }

    placeDoors(rooms) {
        rooms.forEach(room => {
            // Check each cell along room perimeter
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    if (y === room.y || y === room.y + room.height - 1 ||
                        x === room.x || x === room.x + room.width - 1) {
                        // Check if this is a valid door position (floor on both sides)
                        if (this.isValidDoorPosition(x, y)) {
                            if (Math.random() < 0.3) { // 30% chance for door
                                this.interactables.push(new Door(x * 32, y * 32));
                            }
                        }
                    }
                }
            }
        });
    }

    isValidDoorPosition(x, y) {
        // Check if there's a path through this position
        const hasVerticalPath =
            this.getTile(x, y - 1)?.type === 'floor' &&
            this.getTile(x, y + 1)?.type === 'floor';

        const hasHorizontalPath =
            this.getTile(x - 1, y)?.type === 'floor' &&
            this.getTile(x + 1, y)?.type === 'floor';

        return hasVerticalPath || hasHorizontalPath;
    }

    addDecorations() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x].type === 'floor') {
                    // Add random decorations
                    if (Math.random() < 0.05) { // 5% chance
                        const decorTypes = ['crystal', 'mushroom'];
                        const type = decorTypes[Math.floor(Math.random() * decorTypes.length)];
                        this.tiles[y][x] = new Tile(type, x, y);
                    }
                }
            }
        }
    }

    placeEnemies() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x].type === 'floor') {
                    // Add random enemies
                    if (Math.random() < 0.05) { // 5% chance
                        const enemy = new Enemy(x * 32, y * 32);
                        this.entities.push(enemy);
                    }
                }
            }
        }
    }

    placeItems() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x].type === 'floor') {
                    // Add random items
                    if (Math.random() < 0.02) { // 2% chance
                        const item = this.generateRandomItem(x * 32, y * 32);
                        this.items.push(item);
                    }
                }
            }
        }
    }

    generateRandomItem(x, y) {
        const types = ['health', 'weapon', 'armor', 'accessory'];
        const type = types[Math.floor(Math.random() * types.length)];

        switch (type) {
            case 'health':
                return new HealthPotion(x, y);
            case 'weapon':
                return new Weapon(x, y);
            case 'armor':
                return new Armor(x, y);
            case 'accessory':
                return new Accessory(x, y);
        }
    }

    placeBossRoom() {
        // Find the furthest room from start
        const startRoom = this.rooms[0];
        let furthestRoom = startRoom;
        let maxDistance = 0;

        this.rooms.forEach(room => {
            const distance = Math.sqrt(
                Math.pow(room.x - startRoom.x, 2) +
                Math.pow(room.y - startRoom.y, 2)
            );
            if (distance > maxDistance) {
                maxDistance = distance;
                furthestRoom = room;
            }
        });

        // Make boss room
        const centerX = furthestRoom.x + Math.floor(furthestRoom.width / 2);
        const centerY = furthestRoom.y + Math.floor(furthestRoom.height / 2);

        // Add boss
        const bossType = 'medium'; // Choose a random boss type
        const boss = new Boss(bossType, this.section);
        boss.x = centerX * 32;
        boss.y = centerY * 32;
        this.entities.push(boss);

        // Add decoration around boss
        for (let y = furthestRoom.y; y < furthestRoom.y + furthestRoom.height; y++) {
            for (let x = furthestRoom.x; x < furthestRoom.x + furthestRoom.width; x++) {
                if (x === furthestRoom.x || x === furthestRoom.x + furthestRoom.width - 1 ||
                    y === furthestRoom.y || y === furthestRoom.y + furthestRoom.height - 1) {
                    this.tiles[y][x] = new Tile('crystal', x, y);
                }
            }
        }
    }

    update() {
        if (this.isInfinite && this.worldGenerator) {
            // Drive generator visibility around player
            const player = (window.game && window.game.player) || null;
            const px = player ? player.x : 0;
            const py = player ? player.y : 0;
            // worldGenerator expects tile coordinates (tiles, not pixels)
            const tileX = Math.floor(px / 32);
            const tileY = Math.floor(py / 32);
            this.worldGenerator.update(tileX, tileY);

            // Aggregate visible entities from visible sections for compatibility
            this.entities = [];
            for (const section of this.worldGenerator.visibleSections) {
                try {
                    this.entities.push(...section.getEntities());
                } catch (e) { /* ignore */ }
            }

            // Items are tracked at engine level (Section.addItem pushes to engine.items); fall back to engine list
            this.items = (window.game && Array.isArray(window.game.items)) ? window.game.items : [];

            // Update aggregated entities
            this.entities.forEach(entity => { try { entity.update(); } catch (e) {} });
            // Apply tile hazards (lava, chasms, etc.) to all non-player entities so enemies also take damage
            try {
                for (const entity of this.entities) {
                    try {
                        if (!entity || entity === (window.game && window.game.player)) continue;
                        // compute tile under entity
                        if (typeof entity.x !== 'number' || typeof entity.y !== 'number') continue;
                        const tileX = Math.floor(entity.x / 32);
                        const tileY = Math.floor(entity.y / 32);
                        const tile = this.getTile(tileX, tileY);
                        if (tile && tile.damage && typeof entity.takeDamage === 'function') {
                            entity._hazardTimer = (entity._hazardTimer || 0) - deltaTime;
                            if (entity._hazardTimer <= 0) {
                                try { entity.takeDamage(tile.damage, null); } catch (e) {}
                                entity._hazardTimer = 0.5;
                            }
                        } else {
                            entity._hazardTimer = 0;
                        }
                    } catch (e) { /* ignore per-entity hazard errors */ }
                }
            } catch (e) { /* ignore hazard loop errors */ }
            // Update interactables from sections if available
            this.interactables = [];
            for (const section of this.worldGenerator.visibleSections) {
                try { this.interactables.push(...(section.getChests ? section.getChests() : [])); } catch (e) {}
            }

            // Remove dead entities
            this.entities = this.entities.filter(entity => !entity.isDead);
            // Remove collected items
            this.items = this.items.filter(item => !item.isCollected);
            return;
        }

        // Finite world mode
        // Update all entities
        this.entities.forEach(entity => entity.update());

        // Update all interactables
        this.interactables.forEach(interactable => interactable.update());

        // Remove dead entities
        this.entities = this.entities.filter(entity => !entity.isDead);

        // Remove collected items
        this.items = this.items.filter(item => !item.isCollected);
    }

    render(ctx, camera) {
        if (this.isInfinite && this.worldGenerator) {
            // Delegate rendering to the world generator which renders visible sections
            try {
                this.worldGenerator.render(ctx, camera);
            } catch (e) { /* ignore render errors */ }

            // Render items & entities aggregated in world (they may be stored engine-level)
            if (Array.isArray(this.items)) {
                this.items.forEach(item => { if (camera.isOnScreen(item.x, item.y, 32)) { try { item.render(ctx, camera); } catch (e) {} } });
            }
            if (Array.isArray(this.entities)) {
                this.entities.forEach(entity => { if (camera.isOnScreen(entity.x, entity.y, 32)) { try { entity.render(ctx, camera); } catch (e) {} } });
            }
            return;
        }

        // Finite world rendering (legacy)
        // Calculate visible range
        const screenToWorld = camera.screenToWorld(0, 0);
        const visibleRange = {
            startX: Math.max(0, Math.floor(screenToWorld.x / 32 - 1)),
            startY: Math.max(0, Math.floor(screenToWorld.y / 32 - 1)),
            endX: Math.min(this.width, Math.ceil((screenToWorld.x + camera.width) / 32 + 1)),
            endY: Math.min(this.height, Math.ceil((screenToWorld.y + camera.height) / 32 + 1))
        };

        // Render visible tiles
        for (let y = visibleRange.startY; y < visibleRange.endY; y++) {
            for (let x = visibleRange.startX; x < visibleRange.endX; x++) {
                this.tiles[y][x].render(ctx, camera);
            }
        }

        // Render items
        this.items.forEach(item => {
            if (camera.isOnScreen(item.x, item.y, 32)) {
                item.render(ctx, camera);
            }
        });

        // Render interactables
        this.interactables.forEach(interactable => {
            if (camera.isOnScreen(interactable.x, interactable.y, 32)) {
                interactable.render(ctx, camera);
            }
        });

        // Render entities
        this.entities.forEach(entity => {
            if (camera.isOnScreen(entity.x, entity.y, 32)) {
                entity.render(ctx, camera);
            }
        });
    }

    getTile(x, y) {
        if (this.isInfinite && this.worldGenerator) {
            try {
                const tileX = Math.floor(x);
                const tileY = Math.floor(y);
                const chunkSize = this.worldGenerator.CHUNK_SIZE || 16;
                // Determine global chunk indices
                const globalChunkX = Math.floor(tileX / chunkSize);
                const globalChunkY = Math.floor(tileY / chunkSize);
                // Section coords
                const sectionX = Math.floor(globalChunkX / (this.worldGenerator.SECTION_SIZE || 5));
                const sectionY = Math.floor(globalChunkY / (this.worldGenerator.SECTION_SIZE || 5));
                const section = this.worldGenerator.getSection(sectionX, sectionY);
                if (!section) return null;
                const localChunkX = globalChunkX - sectionX * (this.worldGenerator.SECTION_SIZE || 5);
                const localChunkY = globalChunkY - sectionY * (this.worldGenerator.SECTION_SIZE || 5);
                const chunk = section.getChunk(localChunkX, localChunkY);
                if (!chunk) return null;
                const localTileX = tileX - globalChunkX * chunkSize;
                const localTileY = tileY - globalChunkY * chunkSize;
                return chunk.getTile(localTileX, localTileY);
            } catch (e) { return null; }
        }
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return null;
    }

    checkCollision(x, y) {
        const tileX = Math.floor(x / 32);
        const tileY = Math.floor(y / 32);
        const tile = this.getTile(tileX, tileY);
        if (tile && tile.collidable) return true;

        // Check collision with interactables (infinite mode gather interactables from sections)
        const interactables = this.interactables || [];
        for (const interactable of interactables) {
            try {
                if (interactable.collidable && typeof interactable.containsPoint === 'function' && interactable.containsPoint(x, y)) return true;
            } catch (e) { /* ignore */ }
        }

        return false;
    }

    getEnemiesInRange(x, y, range) {
        return this.entities.filter(entity => {
            if (entity instanceof Enemy || entity instanceof Boss) {
                const dx = entity.x - x;
                const dy = entity.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance <= range;
            }
            return false;
        });
    }

    getInteractablesInRange(x, y, range) {
        return this.interactables.filter(interactable => {
            const dx = interactable.x - x;
            const dy = interactable.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= range;
        });
    }
}

// Helper class for room connection algorithm
class DisjointSet {
    constructor(elements) {
        this.elements = new Map();
        elements.forEach(element => {
            this.elements.set(element, element);
        });
    }

    find(element) {
        if (this.elements.get(element) === element) {
            return element;
        }
        const result = this.find(this.elements.get(element));
        this.elements.set(element, result);
        return result;
    }

    union(element1, element2) {
        const root1 = this.find(element1);
        const root2 = this.find(element2);
        if (root1 !== root2) {
            this.elements.set(root2, root1);
        }
    }
}