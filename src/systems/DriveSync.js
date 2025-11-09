class DriveSync {
    constructor() {
        this.initialized = false;
        this.pollInterval = 5000; // Check for updates every 5 seconds
        this.currentMatch = null;
        this.matchFolder = null;
        this.pollTimer = null;
    }

    // Initialize Google Drive API
    async init() {
        try {
            // Load Google Drive API
            await this.loadDriveAPI();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Drive sync:', error);
            return false;
        }
    }

    // Load Google Drive API script
    loadDriveAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client:auth2', () => {
                    gapi.client.init({
                        apiKey: 'YOUR_API_KEY',
                        clientId: 'YOUR_CLIENT_ID',
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                        scope: 'https://www.googleapis.com/auth/drive.file'
                    }).then(resolve).catch(reject);
                });
            };
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    // Start a new match
    async startMatch(playerA, playerB) {
        if (!this.initialized) {
            throw new Error('Drive sync not initialized');
        }

        try {
            // Create match folder
            const folderId = await this.createMatchFolder();
            
            // Initialize match state
            const matchState = {
                matchId: folderId,
                playerA: playerA.id,
                playerB: playerB.id,
                currentTurn: playerA.id,
                round: 1,
                status: 'active',
                lastUpdate: Date.now()
            };

            // Save initial state
            await this.saveMatchState(matchState);

            this.currentMatch = matchState;
            this.matchFolder = folderId;

            // Start polling for updates
            this.startPolling();

            return matchState;
        } catch (error) {
            console.error('Failed to start match:', error);
            throw error;
        }
    }

    // Create a folder for the match
    async createMatchFolder() {
        const metadata = {
            name: `RPG_Match_${Date.now()}`,
            mimeType: 'application/vnd.google-apps.folder'
        };

        const response = await gapi.client.drive.files.create({
            resource: metadata,
            fields: 'id'
        });

        return response.result.id;
    }

    // Save match state to Drive
    async saveMatchState(state) {
        const metadata = {
            name: 'match_state.json',
            parents: [this.matchFolder]
        };

        const content = JSON.stringify(state);

        // Check if file exists
        const existingFile = await this.findFile('match_state.json');
        
        if (existingFile) {
            // Update existing file
            await gapi.client.drive.files.update({
                fileId: existingFile.id,
                resource: metadata,
                media: {
                    mimeType: 'application/json',
                    body: content
                }
            });
        } else {
            // Create new file
            await gapi.client.drive.files.create({
                resource: metadata,
                media: {
                    mimeType: 'application/json',
                    body: content
                },
                fields: 'id'
            });
        }
    }

    // Submit a turn
    async submitTurn(playerId, turnData) {
        if (!this.currentMatch || this.currentMatch.status !== 'active') {
            throw new Error('No active match');
        }

        if (this.currentMatch.currentTurn !== playerId) {
            throw new Error('Not your turn');
        }

        try {
            // Save turn data
            const turnFile = `turn_${this.currentMatch.round}_${playerId}.json`;
            await this.saveTurnData(turnFile, turnData);

            // Update match state
            this.currentMatch.currentTurn = this.getOtherPlayer(playerId);
            this.currentMatch.lastUpdate = Date.now();
            await this.saveMatchState(this.currentMatch);

            return true;
        } catch (error) {
            console.error('Failed to submit turn:', error);
            throw error;
        }
    }

    // Save turn data to Drive
    async saveTurnData(filename, data) {
        const metadata = {
            name: filename,
            parents: [this.matchFolder]
        };

        const content = JSON.stringify(data);

        await gapi.client.drive.files.create({
            resource: metadata,
            media: {
                mimeType: 'application/json',
                body: content
            },
            fields: 'id'
        });
    }

    // Poll for match updates
    startPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }

        this.pollTimer = setInterval(async () => {
            await this.checkForUpdates();
        }, this.pollInterval);
    }

    // Stop polling
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    // Check for match updates
    async checkForUpdates() {
        if (!this.currentMatch) return;

        try {
            const state = await this.getMatchState();
            if (state.lastUpdate > this.currentMatch.lastUpdate) {
                this.currentMatch = state;
                this.onMatchUpdate(state);
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
        }
    }

    // Get current match state
    async getMatchState() {
        const file = await this.findFile('match_state.json');
        if (!file) throw new Error('Match state not found');

        const response = await gapi.client.drive.files.get({
            fileId: file.id,
            alt: 'media'
        });

        return JSON.parse(response.body);
    }

    // Find a file in the match folder
    async findFile(filename) {
        const response = await gapi.client.drive.files.list({
            q: `name='${filename}' and '${this.matchFolder}' in parents`,
            fields: 'files(id, name, modifiedTime)'
        });

        return response.result.files[0];
    }

    // Get other player's ID
    getOtherPlayer(playerId) {
        return playerId === this.currentMatch.playerA ? 
            this.currentMatch.playerB : 
            this.currentMatch.playerA;
    }

    // Event handler for match updates
    onMatchUpdate(state) {
        // Implement event handling logic
        const event = new CustomEvent('matchUpdate', { detail: state });
        window.dispatchEvent(event);
    }

    // Get all turns for current round
    async getCurrentRoundTurns() {
        const response = await gapi.client.drive.files.list({
            q: `name contains 'turn_${this.currentMatch.round}' and '${this.matchFolder}' in parents`,
            fields: 'files(id, name, modifiedTime)'
        });

        const turns = [];
        for (const file of response.result.files) {
            const turnResponse = await gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media'
            });
            turns.push(JSON.parse(turnResponse.body));
        }

        return turns;
    }

    // End the match
    async endMatch(winnerId) {
        if (!this.currentMatch) return;

        try {
            this.currentMatch.status = 'ended';
            this.currentMatch.winner = winnerId;
            this.currentMatch.endTime = Date.now();
            
            await this.saveMatchState(this.currentMatch);
            this.stopPolling();
            
            return true;
        } catch (error) {
            console.error('Failed to end match:', error);
            return false;
        }
    }

    // Clean up match resources
    async cleanup() {
        if (this.matchFolder) {
            try {
                await gapi.client.drive.files.delete({
                    fileId: this.matchFolder
                });
            } catch (error) {
                console.error('Failed to cleanup match resources:', error);
            }
        }
        
        this.stopPolling();
        this.currentMatch = null;
        this.matchFolder = null;
    }
}