class Section {
    constructor(x, y, worldGenerator) {
        this.x = x;
        this.y = y;
        this.worldGenerator = worldGenerator;
        this.gameEngine = worldGenerator?.gameEngine || null;
        this.chunks = new Map();
        this.isGenerated = false;
        this.entities = new Set(); // Bijv. bomen, vijanden
        this.chests = new Set();
        this.SIZE = 5; // aantal chunks per sectie
        this.biome = null;
        this.generate();
    }

    generate() {
        if (this.isGenerated) return;

        // Bepaal biome via biomeGenerator
        this.biome = this.worldGenerator.biomeGenerator.getBiomeAt(this.x, this.y);

        // Genereer chunks binnen deze sectie
        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const chunkX = this.x * this.SIZE + x;
                const chunkY = this.y * this.SIZE + y;
                const chunk = new Chunk(chunkX, chunkY, this);
                this.chunks.set(`${x},${y}`, chunk);
            }
        }

        // Voeg extra features toe afhankelijk van biome
        this.generateFeatures();

        this.isGenerated = true;
    }

    generateFeatures() {
        if (!this.gameEngine) return;

        switch(this.biome) {
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
            const tree = new Tree(pos.x, pos.y); // Tree class moet bestaan
            this.entities.add(tree);
        }
    }

    addCacti(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            const cactus = new Cactus(pos.x, pos.y); // Cactus entiteit zelf toevoegen
            this.entities.add(cactus);
        }
    }

    addEnemies(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            const enemy = new Enemy(this.gameEngine, pos.x, pos.y); // Enemy class vereist gameEngine reference
            this.entities.add(enemy);
        }
    }

    addChests(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomPosition();
            const chest = new Chest(this.gameEngine, pos.x, pos.y); // Chest entiteit
            this.chests.add(chest);
        }
    }

    getRandomPosition() {
        const tileSize = 32; // pixels per tile, af te stemmen op map
        // Random positie binnen deel van deze sectie (in pixels)
        const x = Math.floor(Math.random() * this.SIZE * tileSize);
        const y = Math.floor(Math.random() * this.SIZE * tileSize);
        return { x, y };
    }

    getBiome() {
        return this.biome;
    }

    render(ctx, camera) {
        // Render alle chunks
        for (const chunk of this.chunks.values()) {
            chunk.render(ctx, camera);
        }
        // Render entiteiten zoals bomen, vijanden
        for (const entity of this.entities) {
            if (entity.render) entity.render(ctx, camera);
        }
        // Render kisten apart
        for (const chest of this.chests) {
            if (chest.render) chest.render(ctx, camera);
        }
    }
}
