// Main game initialization
window.addEventListener('load', async () => {
    try {
        // Show loading screen
        const loadingScreen = document.querySelector('.loading-screen');

        // Initialize game engine and make it globally accessible
        const game = new GameEngine();
        window.game = game;

        // Initialize core systems in the correct order
        game.canvas = new Canvas();
        game.canvas.init(); // Initialize canvas explicitly
        
        // Create camera early since many systems depend on it
        game.camera = new Camera(game);
        
        // Initialize remaining core systems
        game.input = new Input(); // Input system to handle keyboard/mouse
        if (!game.input) throw new Error('Failed to create Input system');
        
        game.assetLoader = new AssetLoader();
        game.ui = new UI();
        game.saveManager = new SaveManager(game);
        game.itemManager = new ItemManager(game);

    // Create world generator with a fixed seed for testing and ensure gameEngine is set
    game.worldGenerator = new WorldGenerator(game, 'test-seed');
    game.worldGenerator.gameEngine = game; // Ensure direct reference

    // Initialize texture manager and load textures (non-blocking for dev, but await here to ensure proper draw)
    game.textureManager = new TextureManager();
    await game.textureManager.loadTextures();

    // Get the starting section (0,0)
    const startSection = game.worldGenerator.getSection(0, 0);

    // Create an infinite/procedural world backed by the WorldGenerator
    game.world = new World(game.worldGenerator);

    // Generate/ensure central section and get a default spawn position
    const startPos = game.world.generate();

    // Load other game assets
    await game.assetLoader.loadAll();

        // Initialize game object collections
        game.particles = new Set();
        game.projectiles = new Set();
        game.effects = new Set();
        game.defeatedBosses = new Set();
        game.openedChests = new Set();
        game.items = [];

        // Create and position the player
        game.player = new Player(game);
        // Use provided startPos (spawn at world origin by default)
        // The player should spawn at tile (0,0) in pixels -> (0,0)
        game.player.x = startPos.x || 0;
        game.player.y = startPos.y || 0;
        // Give the player extended spawn invulnerability (5 seconds) to avoid instant damage
        game.player.invulnerableTime = 5.0;
        game.player.isInvulnerable = true;
        // Give the player a basic starter sword in the first weapon slot
        try {
            const starterSword = {
                id: 'starter_sword',
                name: 'Rusty Sword',
                type: 'weapon',
                damage: 12,
                stats: { strength: 0 },
                sprite: game.textureManager ? game.textureManager.getTexture('item_sword') : null,
                use: function(user) { user.attack(); }
            };
            if (game.player && game.player.inventory && game.player.inventory.equipment) {
                game.player.inventory.equipment.weaponSlot1 = starterSword;
            }
        } catch (e) {
            console.warn('Failed to give starter sword:', e);
        }
        
        // Create camera with game engine reference
        game.camera = new Camera(game);

        // Keep camera dimensions in sync with canvas when resized
        if (game.canvas) {
            game.canvas.onResize = (w, h) => {
                if (game.camera) {
                    game.camera.width = w;
                    game.camera.height = h;
                }
            };
        }

        // Debug info is shown on the minimap; top debug panel removed.

        // Game loop is handled by GameEngine.init()

        // Handle window resize
        window.addEventListener('resize', () => {
            game.canvas.resize();
        });

        // Trigger initial resize
        window.dispatchEvent(new Event('resize'));

        // Hide loading screen with fade out
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            // Ensure optional systems in custom folders are loaded (movement/attacks)
            const loadScript = (src) => new Promise((resolve, reject) => {
                try {
                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = () => resolve();
                    s.onerror = () => reject(new Error('Failed to load ' + src));
                    document.head.appendChild(s);
                } catch (e) { reject(e); }
            });

            (async () => {
                try {
                    await loadScript('src/movement/movement.js');
                } catch (e) { /* optional */ }
                try {
                    await loadScript('src/attacks/attacks.js');
                } catch (e) { /* optional */ }

                // Initialize the game engine and start the game loop
                game.init();
            })();
        }, 500);

    } catch (error) {
        console.error('Failed to initialize game:', error);
        const loadingScreen = document.querySelector('.loading-screen');
        loadingScreen.innerHTML = `
            <div class="error-message">
                Error loading game: ${error.message}<br>
                Please refresh the page to try again.
            </div>
        `;
    }
});