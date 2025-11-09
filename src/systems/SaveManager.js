class SaveManager {
    constructor(gameEngine = null) {
        // Optional reference to the game engine so we can persist runtime state
        this.gameEngine = gameEngine;
        this.encryptionKey = null;
        this.currentSave = null;
        this.saveFolder = 'saves';
        // Track defeated bosses in-memory (keeps parity with other SaveManager implementations)
        this.defeatedBosses = new Set();
    }

    // Initialize save system with encryption key
    init(key) {
        this.encryptionKey = key;
    }

    // Save current game state
    async saveGame(gameState, saveName) {
        try {
            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                playerData: gameState.player.save(),
                worldData: {
                    seed: gameState.worldGenerator.seed,
                    defeatedBosses: Array.from(gameState.defeatedBosses || this.defeatedBosses),
                    openedChests: Array.from(gameState.openedChests),
                    currentSection: gameState.currentSection
                },
                inventory: gameState.player.inventory.save()
            };

            const encryptedData = this.encryptData(JSON.stringify(saveData));
            await this.writeSaveFile(saveName, encryptedData);

            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }

    // Load game state
    async loadGame(saveName) {
        try {
            const encryptedData = await this.readSaveFile(saveName);
            const saveData = JSON.parse(this.decryptData(encryptedData));

            // Validate save data
            if (!this.validateSaveData(saveData)) {
                throw new Error('Invalid save data');
            }

            return saveData;
        } catch (error) {
            console.error('Failed to load game:', error);
            return null;
        }
    }

    // Check if a boss id has been defeated
    isBossDefeated(bossId) {
        if (!bossId) return false;
        return this.defeatedBosses.has(bossId);
    }

    // Mark a boss as defeated and persist if possible
    async saveBossDefeated(bossId) {
        if (!bossId) return false;
        this.defeatedBosses.add(bossId);
        // Try to persist to the current save if we have a reference to the game engine and a save name
        try {
            if (this.gameEngine && this.currentSave) {
                await this.saveGame(this.gameEngine, this.currentSave);
            }
            return true;
        } catch (e) {
            console.error('Failed to persist defeated boss:', e);
            return false;
        }
    }

    // List all available saves
    async listSaves() {
        try {
            const saves = await this.readSaveFolder();
            return saves.map(save => ({
                name: save.replace('.sav', ''),
                timestamp: this.getSaveTimestamp(save)
            }));
        } catch (error) {
            console.error('Failed to list saves:', error);
            return [];
        }
    }

    // Delete a save file
    async deleteSave(saveName) {
        try {
            await this.deleteSaveFile(saveName);
            return true;
        } catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }

    // Encrypt data
    encryptData(data) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not set');
        }

        // Simple XOR encryption (for demo - use proper encryption in production)
        let encrypted = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
            encrypted += String.fromCharCode(charCode);
        }
        return btoa(encrypted);
    }

    // Decrypt data
    decryptData(encryptedData) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not set');
        }

        const data = atob(encryptedData);
        let decrypted = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
            decrypted += String.fromCharCode(charCode);
        }
        return decrypted;
    }

    // Validate save data structure
    validateSaveData(data) {
        return (
            data &&
            data.version &&
            data.timestamp &&
            data.playerData &&
            data.worldData &&
            data.inventory
        );
    }

    // File system operations
    async writeSaveFile(saveName, data) {
        const filename = `${saveName}.sav`;
        localStorage.setItem(filename, data);
    }

    async readSaveFile(saveName) {
        const filename = `${saveName}.sav`;
        const data = localStorage.getItem(filename);
        if (!data) {
            throw new Error('Save file not found');
        }
        return data;
    }

    async readSaveFolder() {
        const saves = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.endsWith('.sav')) {
                saves.push(key);
            }
        }
        return saves;
    }

    async deleteSaveFile(saveName) {
        const filename = `${saveName}.sav`;
        localStorage.removeItem(filename);
    }

    // Get save file timestamp
    getSaveTimestamp(filename) {
        try {
            const data = localStorage.getItem(filename);
            if (data) {
                const saveData = JSON.parse(this.decryptData(data));
                return saveData.timestamp;
            }
        } catch (error) {
            console.error('Failed to get save timestamp:', error);
        }
        return 0;
    }

    // Create save preview
    async createSavePreview(saveName) {
        try {
            const saveData = await this.loadGame(saveName);
            if (!saveData) return null;

            return {
                name: saveName,
                timestamp: saveData.timestamp,
                playerLevel: saveData.playerData.level,
                playtime: this.calculatePlaytime(saveData.timestamp),
                defeatedBosses: saveData.worldData.defeatedBosses.length
            };
        } catch (error) {
            console.error('Failed to create save preview:', error);
            return null;
        }
    }

    // Calculate playtime in hours and minutes
    calculatePlaytime(timestamp) {
        const playtime = Date.now() - timestamp;
        const hours = Math.floor(playtime / (1000 * 60 * 60));
        const minutes = Math.floor((playtime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    // Export save data
    async exportSave(saveName) {
        try {
            const saveData = await this.loadGame(saveName);
            if (!saveData) throw new Error('Save not found');

            const blob = new Blob([JSON.stringify(saveData)], {
                type: 'application/json'
            });
            return blob;
        } catch (error) {
            console.error('Failed to export save:', error);
            return null;
        }
    }

    // Import save data
    async importSave(saveName, fileData) {
        try {
            const saveData = JSON.parse(fileData);
            if (!this.validateSaveData(saveData)) {
                throw new Error('Invalid save data');
            }

            await this.saveGame(saveData, saveName);
            return true;
        } catch (error) {
            console.error('Failed to import save:', error);
            return false;
        }
    }
}