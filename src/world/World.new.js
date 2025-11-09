class World {
    constructor(width, height, section) {
        // Ensure valid dimensions
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));
        this.section = section;
        
        // Initialize arrays
        this.tiles = Array(this.height).fill().map(() => Array(this.width).fill(null));
        this.entities = [];
        this.items = [];
        this.interactables = [];
        this.rooms = [];
        
        // Create noise generator with fixed seed for testing
        this.noise = new SimplexNoise('test-seed');
        
        // Initialize base tiles
        this.initializeTiles();
    }

    initializeTiles() {
        // Fill the world with initial tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const value = (this.noise.noise2D(x * 0.1, y * 0.1) + 1) / 2;
                const type = value > 0.5 ? 'wall' : 'floor';
                this.tiles[y][x] = new Tile(type, x, y);
            }
        }
    }

    generate() {
        // Reset world state
        this.entities = [];
        this.items = [];
        this.interactables = [];

        // Generate world features
        const rooms = this.generateRooms();
        this.rooms = rooms;
        
        // Build the world
        this.connectRooms(rooms);
        this.placeDoors(rooms);
        this.addDecorations();
        this.placeEnemies();
        this.placeItems();
        this.placeBossRoom();
        
        // Return player starting position
        const startRoom = rooms[0];
        return {
            x: (startRoom.x + startRoom.width / 2) * 32,
            y: (startRoom.y + startRoom.height / 2) * 32
        };
    }

    setTile(x, y, type) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y][x] = new Tile(type, x, y);
            return true;
        }
        return false;
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
            
            if (!space || space.width < minRoomSize || space.height < minRoomSize) {
                continue;
            }
            
            // If space is small enough, make it a room
            if (space.width <= maxRoomSize && space.height <= maxRoomSize) {
                rooms.push(space);
                continue;
            }

            // Split space
            const splitHorizontally = space.width < space.height;
            const splitPos = Math.floor(Math.random() * 0.4 + 0.3); // Split between 30-70%
            
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
                    for (let x = room.x; x < room.x + room.width; x++) {
                        if (x >= 0 && x < this.width) {
                            this.setTile(x, y, 'floor');
                        }
                    }
                }
            }
        });

        return rooms;
    }

    connectRooms(rooms) {
        if (!rooms.length) return;

        // Create edges between rooms
        const edges = [];
        rooms.forEach((room1, i) => {
            rooms.slice(i + 1).forEach(room2 => {
                const center1 = {
                    x: room1.x + Math.floor(room1.width / 2),
                    y: room1.y + Math.floor(room1.height / 2)
                };
                const center2 = {
                    x: room2.x + Math.floor(room2.width / 2),
                    y: room2.y + Math.floor(room2.height / 2)
                };
                const distance = Math.sqrt(
                    Math.pow(center2.x - center1.x, 2) +
                    Math.pow(center2.y - center1.y, 2)
                );
                edges.push({ room1, room2, distance });
            });
        });

        // Sort edges by distance
        edges.sort((a, b) => a.distance - b.distance);

        // Create minimum spanning tree
        const sets = new DisjointSet(rooms);
        const corridors = [];

        edges.forEach(edge => {
            if (sets.find(edge.room1) !== sets.find(edge.room2)) {
                sets.union(edge.room1, edge.room2);
                corridors.push(edge);
            }
        });

        // Add some extra corridors
        edges.forEach(edge => {
            if (Math.random() < 0.2) {
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

            // Draw L-shaped corridor
            let x = start.x;
            let y = start.y;
            
            // Horizontal part
            while (x !== end.x) {
                x += Math.sign(end.x - x);
                this.setTile(x, y, 'floor');
            }
            
            // Vertical part
            while (y !== end.y) {
                y += Math.sign(end.y - y);
                this.setTile(x, y, 'floor');
            }
        });
    }

    placeDoors(rooms) {
        rooms.forEach(room => {
            // Check perimeter
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    if (y === room.y || y === room.y + room.height - 1 ||
                        x === room.x || x === room.x + room.width - 1) {
                        if (this.isValidDoorPosition(x, y)) {
                            if (Math.random() < 0.3) {
                                this.interactables.push(new Door(x * 32, y * 32));
                            }
                        }
                    }
                }
            }
        });
    }

    isValidDoorPosition(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }

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
                    if (Math.random() < 0.05) {
                        const decorTypes = ['crystal', 'mushroom'];
                        const type = decorTypes[Math.floor(Math.random() * decorTypes.length)];
                        this.setTile(x, y, type);
                    }
                }
            }
        }
    }

    placeEnemies() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x].type === 'floor') {
                    if (Math.random() < 0.05) {
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
                    if (Math.random() < 0.02) {
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
        if (!this.rooms.length) return;

        // Find furthest room from start
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

        // Create boss
        const centerX = furthestRoom.x + Math.floor(furthestRoom.width / 2);
        const centerY = furthestRoom.y + Math.floor(furthestRoom.height / 2);
        
        const boss = new Boss('medium', this.section);
        boss.setPosition(centerX, centerY);
        this.entities.push(boss);
        
        // Add decorations
        for (let y = furthestRoom.y; y < furthestRoom.y + furthestRoom.height; y++) {
            for (let x = furthestRoom.x; x < furthestRoom.x + furthestRoom.width; x++) {
                if (x === furthestRoom.x || x === furthestRoom.x + furthestRoom.width - 1 ||
                    y === furthestRoom.y || y === furthestRoom.y + furthestRoom.height - 1) {
                    this.setTile(x, y, 'crystal');
                }
            }
        }
    }

    getTile(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return null;
    }

    update() {
        // Update game objects
        this.entities.forEach(entity => entity.update());
        this.interactables.forEach(interactable => interactable.update());
        
        // Remove dead/collected objects
        this.entities = this.entities.filter(entity => !entity.isDead);
        this.items = this.items.filter(item => !item.isCollected);
    }

    render(ctx, camera) {
        // Get visible range
        const screenToWorld = camera.screenToWorld(0, 0);
        const visibleRange = {
            startX: Math.max(0, Math.floor(screenToWorld.x / 32 - 1)),
            startY: Math.max(0, Math.floor(screenToWorld.y / 32 - 1)),
            endX: Math.min(this.width, Math.ceil((screenToWorld.x + camera.width) / 32 + 1)),
            endY: Math.min(this.height, Math.ceil((screenToWorld.y + camera.height) / 32 + 1))
        };

        // Render tiles in visible range
        for (let y = visibleRange.startY; y < visibleRange.endY; y++) {
            for (let x = visibleRange.startX; x < visibleRange.endX; x++) {
                if (this.tiles[y] && this.tiles[y][x]) {
                    this.tiles[y][x].render(ctx, camera);
                }
            }
        }

        // Render game objects
        [...this.items, ...this.interactables, ...this.entities].forEach(obj => {
            if (camera.isOnScreen(obj.x, obj.y, 32)) {
                obj.render(ctx, camera);
            }
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