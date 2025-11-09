class SaveManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.saveSlots = 3;
        this.currentSlot = null;
        this.autoSaveInterval = 5 * 60 * 1000; // 5 minutes
        this.lastAutoSave = Date.now();
        // Track defeated bosses in-memory and persist with save data
        this.defeatedBosses = new Set();
    }

    init() {
        // Start auto-save timer
        setInterval(() => this.autoSave(), 60000); // Check every minute
    }

    getSaveSlots() {
        const slots = [];
        for (let i = 0; i < this.saveSlots; i++) {
            const save = localStorage.getItem(`gamesave_${i}`);
            if (save) {
                const data = JSON.parse(save);
                slots.push({
                    slot: i,
                    timestamp: data.timestamp,
                    playerLevel: data.player.stats.level,
                    playtime: data.playtime
                });
            } else {
                slots.push({
                    slot: i,
                    empty: true
                });
            }
        }
        return slots;
    }

    save(slot = this.currentSlot) {
        if (slot === null) {
            throw new Error('No save slot selected');
        }

        const saveData = {
            timestamp: Date.now(),
            playtime: this.gameEngine.playtime,
            player: this.gameEngine.player.save(),
            camera: {
                x: this.gameEngine.camera.x,
                y: this.gameEngine.camera.y,
                scale: this.gameEngine.camera.scale
            },
            world: this.saveWorld(),
            entities: this.saveEntities()
            ,
            defeatedBosses: Array.from(this.defeatedBosses)
        };

        try {
            localStorage.setItem(`gamesave_${slot}`, JSON.stringify(saveData));
            console.log(`Game saved to slot ${slot}`);
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    load(slot) {
        const saveData = localStorage.getItem(`gamesave_${slot}`);
        if (!saveData) {
            throw new Error(`No save data found in slot ${slot}`);
        }

        try {
            const data = JSON.parse(saveData);
            this.currentSlot = slot;

            // Reset current game state
            this.gameEngine.reset();

            // Load player data
            this.gameEngine.player.load(data.player);

            // Load camera position
            this.gameEngine.camera.x = data.camera.x;
            this.gameEngine.camera.y = data.camera.y;
            this.gameEngine.camera.scale = data.camera.scale;
            this.gameEngine.camera.targetX = data.camera.x;
            this.gameEngine.camera.targetY = data.camera.y;
            this.gameEngine.camera.targetScale = data.camera.scale;

            // Load world and entities
            this.loadWorld(data.world);
            this.loadEntities(data.entities);

            // Update playtime
            this.gameEngine.playtime = data.playtime || 0;

            // Restore defeated bosses set
            this.defeatedBosses = new Set(data.defeatedBosses || []);

            console.log(`Game loaded from slot ${slot}`);
            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }

    deleteSave(slot) {
        try {
            localStorage.removeItem(`gamesave_${slot}`);
            if (this.currentSlot === slot) {
                this.currentSlot = null;
            }
            return true;
        } catch (e) {
            console.error('Failed to delete save:', e);
            return false;
        }
    }

    autoSave() {
        const now = Date.now();
        if (now - this.lastAutoSave >= this.autoSaveInterval) {
            if (this.currentSlot !== null) {
                this.save();
                this.lastAutoSave = now;
            }
        }
    }

    saveWorld() {
        const chunks = new Map();
        for (const [key, chunk] of this.gameEngine.world.chunks) {
            chunks.set(key, chunk.save());
        }
        return Array.from(chunks.entries());
    }

    loadWorld(worldData) {
        for (const [key, chunkData] of worldData) {
            const chunk = this.gameEngine.world.getOrCreateChunk(
                chunkData.x,
                chunkData.y
            );
            chunk.load(chunkData);
        }
    }

    saveEntities() {
        return this.gameEngine.entities
            .filter(entity => !(entity === this.gameEngine.player))
            .map(entity => ({
                type: entity.constructor.name,
                data: entity.save()
            }));
    }

    loadEntities(entitiesData) {
        for (const entityData of entitiesData) {
            const EntityClass = this.gameEngine.entityTypes[entityData.type];
            if (EntityClass) {
                const entity = new EntityClass(this.gameEngine);
                entity.load(entityData.data);
                this.gameEngine.addEntity(entity);
            }
        }
    }

    exportSave(slot = this.currentSlot) {
        const saveData = localStorage.getItem(`gamesave_${slot}`);
        if (!saveData) {
            throw new Error(`No save data found in slot ${slot}`);
        }

        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `game_save_${slot}_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const saveData = JSON.parse(e.target.result);
                    
                    // Find empty slot
                    let slot = 0;
                    while (slot < this.saveSlots && localStorage.getItem(`gamesave_${slot}`)) {
                        slot++;
                    }
                    
                    if (slot >= this.saveSlots) {
                        reject(new Error('No empty save slots available'));
                        return;
                    }
                    
                    localStorage.setItem(`gamesave_${slot}`, JSON.stringify(saveData));
                    resolve(slot);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read save file'));
            reader.readAsText(file);
        });
    }

    // Check if a boss id has been defeated (restored from save or updated during runtime)
    isBossDefeated(bossId) {
        if (!bossId) return false;
        return this.defeatedBosses.has(bossId);
    }

    // Mark a boss as defeated and persist to current save slot if available
    saveBossDefeated(bossId) {
        if (!bossId) return false;
        this.defeatedBosses.add(bossId);
        // If there's an active save slot, write the save immediately to keep state consistent
        try {
            if (this.currentSlot !== null) {
                // Save() will include defeatedBosses
                this.save(this.currentSlot);
            }
            return true;
        } catch (e) {
            console.error('Failed to persist defeated boss:', e);
            return false;
        }
    }
}