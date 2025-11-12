class BiomeGenerator {
    constructor(seed) {
        this.seed = seed;
        this.noiseBase = new SimplexNoise(seed.toString());
        this.noiseTemp = new SimplexNoise((seed + '_temp').toString());
        this.noiseMoisture = new SimplexNoise((seed + '_moist').toString());

        this.biomes = {
            NarrowTunnels: {
                getTileType: (noise) => noise > 0.7 ? 'wall' : 'floor',
                getColor: () => '#443322'
            },
            OpenCaverns: {
                getTileType: (noise) => noise > 0.85 ? 'wall' : 'floor',
                getColor: () => '#554433'
            },
            CrystalDepths: {
                getTileType: (noise) => {
                    if (noise > 0.8) return 'crystal';
                    if (noise > 0.6) return 'pillar';
                    if (noise > 0.5) return 'rubble';
                    if (noise > 0.4) return 'wall';
                    return 'floor';
                },
                getColor: () => '#445566'
            },
            MushroomCaverns: {
                getTileType: (noise, baseNoise) => {
                    if (noise > 0.7 && baseNoise > 0) return 'mushroom';
                    if (noise > 0.85) return 'pillar';
                    if (noise > 0.8) return 'wall';
                    return 'floor';
                },
                getColor: () => '#554455'
            },
            AbyssChasm: {
                getTileType: (noise) => {
                    if (noise < 0.25) return 'chasm';
                    if (noise < 0.45) return 'water';
                    if (noise > 0.75) return 'wall';
                    return 'floor';
                },
                getColor: () => '#333344'
            },
            ForgottenRuins: {
                getTileType: (noise) => {
                    if (noise > 0.9) return 'pillar';
                    if (noise > 0.85) return 'rubble';
                    if (noise > 0.75) return 'wall';
                    if (noise > 0.65) return 'floor';
                    return 'dirt';
                },
                getColor: () => '#665544'
            },
            LavaHollows: {
                getTileType: (noise, baseNoise) => {
                    if (noise < 0.45 - (baseNoise * 0.15)) return 'lava';
                    if (noise > 0.8) return 'wall';
                    if (noise > 0.5) return 'floor';
                    return 'sand';
                },
                getColor: () => '#664433'
            }
        };
    }

    getNoise(x, y, scale = 1, octave = 0) {
        switch (octave) {
            case 0: return this.noiseBase.noise2D(x * scale, y * scale);
            case 1: return this.noiseTemp.noise2D(x * scale, y * scale);
            case 2: return this.noiseMoisture.noise2D(x * scale, y * scale);
            default: return 0;
        }
    }

    getBiomeAt(x, y) {
        const baseNoise = this.getNoise(x, y, 0.03, 0);
        const tempNoise = this.getNoise(x, y, 0.02, 1);
        const moistureNoise = this.getNoise(x, y, 0.02, 2);

        const combined = baseNoise + tempNoise * 0.5 + moistureNoise * 0.5;

        if (combined < -0.6) return this.biomes.NarrowTunnels;
        if (combined < -0.3) return this.biomes.OpenCaverns;
        if (combined < 0.0) return this.biomes.CrystalDepths;
        if (combined < 0.2) return this.biomes.MushroomCaverns;
        if (combined < 0.4) return this.biomes.AbyssChasm;
        if (combined < 0.6) return this.biomes.ForgottenRuins;
        return this.biomes.LavaHollows;
    }
}

class Section {
    // ... je bestaande constructor en methodes
    
    generateFeatures() {
        // Voorbeeld implementatie: maak 2 kisten per sectie
        this.generateChests(2);

        // Boss kans en extra kisten kunnen hier ook
        // Bijvoorbeeld:
        const sectionHash = this.x * 31 + this.y;
        const random = this.worldGenerator.seededRandom(sectionHash);
        const roll = random();

        if (roll < 0.11) { // 1/9 kans normale boss
            const bossType = this.determineBossType(); // implementeer deze methode
            this.generateBoss(bossType);
            this.generateChests(5); // extra kisten
        } else if (roll < 0.36) { // 1/4 kans mini-boss
            this.generateBoss('mini');
            this.generateChests(2);
        }
    }

    generateChests(count) {
        // Implementeer chest generatie logica, als je deze hebt
    }

    generateBoss(type) {
        // Implementeer boss creatie, als je deze hebt
    }
    
    // Optioneel andere methodes die generateFeatures nodig heeft
}
