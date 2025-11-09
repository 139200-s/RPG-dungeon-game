class BiomeGenerator {
    constructor(seed) {
        this.seed = seed;
        // Use the external SimplexNoise library
        this.noise = new SimplexNoise(seed.toString());
        
        // Biome definitions
        this.biomes = {
            NarrowTunnels: {
                getTileType: (noise, baseNoise) => {
                    // Create narrow 1-2 tile wide tunnels
                    return noise > 0.7 ? 'wall' : 'floor';
                },
                getColor: () => '#443322'
            },
            
            OpenCaverns: {
                getTileType: (noise, baseNoise) => {
                    // Create wide open spaces with occasional pillars
                    return noise > 0.85 ? 'wall' : 'floor';
                },
                getColor: () => '#554433'
            },
            
            CrystalDepths: {
                getTileType: (noise, baseNoise) => {
                    // More crystals, occasional walls
                    if (noise > 0.75) return 'crystal';
                    if (noise > 0.6) return 'wall';
                    return 'floor';
                },
                getColor: () => '#445566'
            },
            
            MushroomCaverns: {
                getTileType: (noise, baseNoise) => {
                    // Pockets of mushrooms with soft floors
                    if (noise > 0.7 && baseNoise > 0) return 'mushroom';
                    if (noise > 0.8) return 'wall';
                    return 'floor';
                },
                getColor: () => '#554455'
            },
            
            AbyssChasm: {
                getTileType: (noise, baseNoise) => {
                    // Deep chasms with thin walkways
                    if (noise < 0.35) return 'chasm';
                    if (noise > 0.85) return 'wall';
                    return 'floor';
                },
                getColor: () => '#333344'
            },
            
            ForgottenRuins: {
                getTileType: (noise, baseNoise) => {
                    if (noise > 0.9) return 'pillar';
                    if (noise > 0.85) return 'rubble';
                    return noise > 0.7 ? 'wall' : 'floor';
                },
                getColor: () => '#665544'
            },
            
            LavaHollows: {
                getTileType: (noise, baseNoise) => {
                    // Large lava pools: bias toward lava in low-noise regions
                    if (noise < 0.45 - (baseNoise * 0.15)) return 'lava';
                    if (noise > 0.8) return 'wall';
                    return 'floor';
                },
                getColor: () => '#664433'
            }
        };
    }

    getNoise(x, y, scale = 1) {
        return this.noise.noise2D(x * scale, y * scale);
    }

    getBiomeAt(x, y) {
        // Get noise values at different scales for biome determination
        const baseNoise = this.getNoise(x, y, 0.1);
        const detailNoise = this.getNoise(x, y, 0.05);
        
        // Use noise values to determine biome
        // This creates smooth transitions between biomes
        let biomeType = this.determineBiomeType(baseNoise, detailNoise);
        
        return this.biomes[biomeType];
    }

    determineBiomeType(baseNoise, detailNoise) {
        const combined = (baseNoise + detailNoise) / 2;
        
        if (combined < -0.5) return 'NarrowTunnels';
        if (combined < -0.3) return 'OpenCaverns';
        if (combined < -0.1) return 'CrystalDepths';
        if (combined < 0.1) return 'MushroomCaverns';
        if (combined < 0.3) return 'AbyssChasm';
        if (combined < 0.5) return 'ForgottenRuins';
        return 'LavaHollows';
    }

    // Removed internal SimplexNoise implementation as we're using the external library
}