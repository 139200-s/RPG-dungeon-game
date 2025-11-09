class Input {
    constructor() {
        this.keys = new Set();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = new Set();
        this.actions = new Map();

        // Define default key bindings
        // Movement
        this.actions.set('moveUp', ['w', 'ArrowUp']);
        this.actions.set('moveDown', ['s', 'ArrowDown']);
        this.actions.set('moveLeft', ['a', 'ArrowLeft']);
        this.actions.set('moveRight', ['d', 'ArrowRight']);
        this.actions.set('sprint', ['Shift']);
        
        // Combat
        this.actions.set('attack', ['Space', 'mouse0']);
        this.actions.set('block', ['mouse1']);
        this.actions.set('dodge', ['Control']);
        
        // Equipment
        this.actions.set('weaponSlot1', ['1']);
        this.actions.set('weaponSlot2', ['2']);
        this.actions.set('potion1', ['q']);
        this.actions.set('potion2', ['r']);
        this.actions.set('potion3', ['f']);
        this.actions.set('ability1', ['e']);
        this.actions.set('ability2', ['c']);
        this.actions.set('ability3', ['v']);
        
        // Interface
        this.actions.set('interact', ['e']);
        this.actions.set('inventory', ['Tab', 'i']);
        this.actions.set('map', ['m']);
        this.actions.set('character', ['k']);
        this.actions.set('pause', ['Escape']);

        // Set up event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Add fullscreen handler (F key)
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'f') {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                } else {
                    const canvas = document.getElementById('gameCanvas');
                    if (canvas && canvas.requestFullscreen) {
                        canvas.requestFullscreen().catch(() => {});
                    }
                }
                e.preventDefault();
            }
        });
    }

    // Called by GameEngine.init(); keep consistent with other systems
    init() {
        // No initialization required for Input beyond event listeners
    }

    handleKeyDown(event) {
        // Normalize key names so they match action definitions
        let key = event.key;
        if (key === ' ') key = 'Space';
        if (key.length === 1) key = key.toLowerCase();

        // Prevent default browser behavior for important game keys
        const prevent = ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (prevent.includes(event.key)) event.preventDefault();

        this.keys.add(key);
    }

    handleKeyUp(event) {
        let key = event.key;
        if (key === ' ') key = 'Space';
        if (key.length === 1) key = key.toLowerCase();
        this.keys.delete(key);
    }

    handleMouseDown(event) {
        this.mouseButtons.add(`mouse${event.button}`);
    }

    handleMouseUp(event) {
        this.mouseButtons.delete(`mouse${event.button}`);
    }

    handleMouseMove(event) {
        try {
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                this.mousePosition = {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                };
            }
        } catch (e) {
            console.warn('Mouse move error:', e);
            this.mousePosition = { x: 0, y: 0 };
        }
    }

    handleWheel(event) {
        // Scroll wheel cycles hotbar slots
        const dir = event.deltaY > 0 ? 1 : -1;
        try {
            if (window.game && window.game.player && typeof window.game.player.selectHotbarOffset === 'function') {
                window.game.player.selectHotbarOffset(dir);
            }
        } catch (e) {
            // ignore
        }
        // Prevent page from scrolling while playing
        event.preventDefault();
    }

    isKeyDown(key) {
        return this.keys.has((key && key.length === 1) ? key.toLowerCase() : key);
    }

    isMouseButtonDown(button) {
        return this.mouseButtons.has(`mouse${button}`);
    }

    getMousePosition() {
        return { ...this.mousePosition };
    }

    isActionPressed(action) {
        const keys = this.actions.get(action);
        if (!keys) return false;

        return keys.some(key => 
            key.startsWith('mouse') 
                ? this.isMouseButtonDown(parseInt(key.slice(5)))
                : this.isKeyDown(key)
        );
    }

    getMovementVector() {
        let dx = 0;
        let dy = 0;

        // Use -1..1 deltas for direction. Previous 1000 multipliers were accidental and caused unstable behavior.
        if (this.isActionPressed('moveRight')) dx += 1;
        if (this.isActionPressed('moveLeft')) dx -= 1;
        if (this.isActionPressed('moveDown')) dy += 1;
        if (this.isActionPressed('moveUp')) dy -= 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        return { dx, dy, isMoving: dx !== 0 || dy !== 0 };
    }

    // Add custom key bindings
    bindAction(action, keys) {
        this.actions.set(action, keys);
    }

    // Remove custom key bindings
    unbindAction(action) {
        this.actions.delete(action);
    }

    // Reset all bindings to default
    resetBindings() {
        this.actions.clear();
        this.actions.set('moveUp', ['w', 'ArrowUp']);
        this.actions.set('moveDown', ['s', 'ArrowDown']);
        this.actions.set('moveLeft', ['a', 'ArrowLeft']);
        this.actions.set('moveRight', ['d', 'ArrowRight']);
        this.actions.set('attack', ['Space', 'mouse0']);
        this.actions.set('interact', ['e', 'mouse1']);
        this.actions.set('inventory', ['Tab', 'i']);
        this.actions.set('pause', ['Escape']);
    }

    // Clean up event listeners (call this when game is destroyed)
    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        
        // Remove resize handler from window
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
    }
}