#werkt'niet?

class WorldGenerator {
    constructor(gameOrSeed = Date.now(), maybeSeed) {
        if (typeof gameOrSeed === 'object' && gameOrSeed !== null) {
            this.gameEngine = gameOrSeed;
            this.seed = maybeSeed || Date.now();
        } else {
            this.gameEngine = null;
            this.seed = gameOrSeed || Date.now();
        }
        this.sections = new Map();
        this.biomeGenerator = new BiomeGenerator(this.seed);
        this.SECTION_SIZE = 5;
        this.CHUNK_SIZE = 16;
        this.loadedSections = new Set();
        this.visibleSections = new Set();
        this.getSection(0, 0);
    }

    getSection(sectionX, sectionY) {
        const key = `${sectionX},${sectionY}`;
        if (!this.sections.has(key)) {
            const section = new Section(sectionX, sectionY, this);
            this.sections.set(key, section);
        }
        return this.sections.get(key);
    }

    updateVisibleSections(playerX, playerY) {
        const viewDistance = 3;
        const loadDistance = 4;
        this.visibleSections.clear();
        const centerX = Math.floor(playerX / (this.SECTION_SIZE * this.CHUNK_SIZE));
        const centerY = Math.floor(playerY / (this.SECTION_SIZE * this.CHUNK_SIZE));
        let movementVector = { dx: 0, dy: 0 };
        try {
            movementVector = (this.gameEngine && this.gameEngine.input && this.gameEngine.input.getMovementVector)
                ? this.gameEngine.input.getMovementVector()
                : { dx: 0, dy: 0 };
        } catch { }
        const loadAheadX = Math.sign(movementVector.dx);
        const loadAheadY = Math.sign(movementVector.dy);

        for (let dx = -loadDistance; dx <= loadDistance; dx++) {
            for (let dy = -loadDistance; dy <= loadDistance; dy++) {
                const section = this.getSection(centerX + dx, centerY + dy);
                if (Math.abs(dx) <= viewDistance && Math.abs(dy) <= viewDistance ||
                    Math.abs(dx + loadAheadX) <= viewDistance && Math.abs(dy + loadAheadY) <= viewDistance) {
                    this.visibleSections.add(section);
                    if (!section.isGenerated) section.generate();
                }
            }
        }
    }

    render(ctx, camera) {
        for (const section of this.visibleSections) {
            section.render(ctx, camera);
        }
    }
}

