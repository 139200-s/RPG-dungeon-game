class Section {
    constructor(x, y, worldGenerator) {
        this.x = x;
        this.y = y;
        this.worldGenerator = worldGenerator;
        this.gameEngine = worldGenerator?.gameEngine || null;
        this.chunks = new Map();
        this.isGenerated = false;
        this.entities = new Set(); // b.v. bomen, vijanden
        this.chests = new Set();
        this.SIZE = 5; // aantal chunks per sectie
        this.biome = null;

        this.generate();
    }

    generate() {
        if (this.isGenerated) return;

        // Biome ophalen via biomeGenerator
        this.biome = this.worldGenerator.biomeGenerator.getBiomeAt(this.x, this.y);

        // Chunks genereren binnen deze sectie
        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const chunkCoordsX = this.x * this.SIZE + x;
                const chunkCoordsY = this.y * this.SIZE + y;
                const chunk = new Chunk(chunkCoordsX, chunkCoordsY, this);
                this.chunks.set(`${x},${y}`, chunk);
            }
        }

        // Extra features toevoegen
        this.generateFeatures();

        this.isGenerated = true;
    }

    generateFeatures() {
        if (!this.gameEngine) return;

        switch (this.biome) {
            case 'forest':
                this.addTrees(10);
                this.addChests(3);
                break;
            case 'desert':
                this.addCacti(5);
                this.addChests(1);
                break;
            case 'dungeon':
                this.addEnemies(8);
                this.addChests(5);
                break;
            default:
                this.addChests(1);
        }
    }

    addTrees(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            let tree = null;
            if (typeof Tree !== 'undefined') {
                tree = new Tree(pos.x, pos.y);
            } else {
                // fallback: creeer dummy object met render functie
                tree = { x: pos.x, y: pos.y, render: () => {} };
            }
            this.entities.add(tree);
        }
    }

    addCacti(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            let cactus = null;
            if (typeof Cactus !== 'undefined') {
                cactus = new Cactus(pos.x, pos.y);
            } else {
                cactus = { x: pos.x, y: pos.y, render: () => {} };
            }
            this.entities.add(cactus);
        }
    }

    addEnemies(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            let enemy = null;
            if (typeof Enemy !== 'undefined' && this.gameEngine) {
                enemy = new Enemy(this.gameEngine, pos.x, pos.y);
            } else {
                enemy = { x: pos.x, y: pos.y, render: () => {} };
            }
            this.entities.add(enemy);
        }
    }

    addChests(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            let chest = null;
            if (typeof Chest !== 'undefined' && this.gameEngine) {
                chest = new Chest(this.gameEngine, pos.x, pos.y);
            } else {
                chest = { x: pos.x, y: pos.y, render: () => {} };
            }
            this.chests.add(chest);
        }
    }

    getRandomPosition() {
        const tileSize = 32; // pas aan op je tile size
        return {
            x: Math.floor(Math.random() * this.SIZE * tileSize),
            y: Math.floor(Math.random() * this.SIZE * tileSize),
        };
    }

    getBiome() {
        return this.biome;
    }

    render(ctx, camera) {
        for (const chunk of this.chunks.values()) {
            chunk.render(ctx, camera);
        }
        for (const entity of this.entities) {
            if (entity.render) entity.render(ctx, camera);
        }
        for (const chest of this.chests) {
            if (chest.render) chest.render(ctx, camera);
        }
    }
}
