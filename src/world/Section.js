class Section {
    constructor(x, y, worldGenerator) {
        this.x = x;
        this.y = y;
        this.worldGenerator = worldGenerator;
        this.gameEngine = worldGenerator?.gameEngine || null;
        this.chunks = new Map();
        this.isGenerated = false;
        this.entities = new Set();
        this.chests = new Set();
        this.SIZE = 5;

        this.biome = null;

        this.featureQueue = [];  // queue met functies om features toe te voegen
        this.featuresPerFrame = 2; // aantal features per frame toevoegen om lag te verminderen

        this.generate();
    }

    generate() {
        if (this.isGenerated) return;

        this.biome = this.worldGenerator.biomeGenerator.getBiomeAt(this.x, this.y);

        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const chunkX = this.x * this.SIZE + x;
                const chunkY = this.y * this.SIZE + y;
                const chunk = new Chunk(chunkX, chunkY, this);
                this.chunks.set(`${x},${y}`, chunk);
            }
        }

        this.prepareGenerateFeaturesQueue();

        this.isGenerated = true;
    }

    prepareGenerateFeaturesQueue() {
        // Voeg feature-add functies toe aan de queue om ze per frame toe te voegen
        switch (this.biome) {
            case 'forest':
                this.enqueueFeatureAddition(() => this.addTrees(10));
                this.enqueueFeatureAddition(() => this.addChests(3));
                break;
            case 'desert':
                this.enqueueFeatureAddition(() => this.addCacti(5));
                this.enqueueFeatureAddition(() => this.addChests(1));
                break;
            case 'dungeon':
                this.enqueueFeatureAddition(() => this.addEnemies(8));
                this.enqueueFeatureAddition(() => this.addChests(5));
                break;
            default:
                this.enqueueFeatureAddition(() => this.addChests(1));
        }
    }

    enqueueFeatureAddition(func) {
        this.featureQueue.push(func);
    }

    updateFeatures() {
        // Voeg per frame een beperkt aantal features toe om haperen te voorkomen
        let count = 0;
        while (this.featureQueue.length > 0 && count < this.featuresPerFrame) {
            const func = this.featureQueue.shift();
            if (func) func();
            count++;
        }
    }

    addTrees(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            const tree = (typeof Tree !== 'undefined') ? new Tree(pos.x, pos.y) : { x: pos.x, y: pos.y, render: () => {} };
            this.entities.add(tree);
        }
    }

    addCacti(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            const cactus = (typeof Cactus !== 'undefined') ? new Cactus(pos.x, pos.y) : { x: pos.x, y: pos.y, render: () => {} };
            this.entities.add(cactus);
        }
    }

    addEnemies(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            const enemy = (typeof Enemy !== 'undefined' && this.gameEngine) ? new Enemy(this.gameEngine, pos.x, pos.y) : { x: pos.x, y: pos.y, render: () => {} };
            this.entities.add(enemy);
        }
    }

    addChests(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            const chest = (typeof Chest !== 'undefined' && this.gameEngine) ? new Chest(this.gameEngine, pos.x, pos.y) : { x: pos.x, y: pos.y, render: () => {} };
            this.chests.add(chest);
        }
    }

    getRandomPosition() {
        const tileSize = 32;
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
