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
        this.generate();
    }

    generate() {
        if (this.isGenerated) return;

        this.biome = this.worldGenerator.biomeGenerator.getBiomeAt(this.x, this.y);

        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const chunk = new Chunk(this.x * this.SIZE + x, this.y * this.SIZE + y, this);
                this.chunks.set(`${x},${y}`, chunk);
            }
        }

        this.generateFeatures();
        this.isGenerated = true;
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
