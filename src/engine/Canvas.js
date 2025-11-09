class Canvas {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Constants
        this.TILE_SIZE = 32;
        this.CHUNK_SIZE = this.TILE_SIZE;
        this.SECTION_SIZE = this.CHUNK_SIZE * 5;

        // Set initial size
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Initialize view parameters
        this.viewX = 0;
        this.viewY = 0;
        this.zoom = 1;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Make canvas focusable and auto-focus on click so Tab/Space are captured
        try {
            this.canvas.tabIndex = this.canvas.tabIndex || 0;
            this.canvas.style.outline = 'none';
            this.canvas.addEventListener('click', () => this.canvas.focus());
        } catch (e) {
            // Some environments may not allow modifying canvas tabindex; ignore
        }
    }

    init() {
        // Enable image smoothing for scaling
        this.ctx.imageSmoothingEnabled = false;
    }

    resize() {
        // Get the screen dimensions
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Calculate the optimal game size
        // Using 16:9 aspect ratio for widescreen displays
        const aspectRatio = 16 / 9;
        
        // Use 90% of the screen height as base
        let height = Math.floor(screenHeight * 0.9);
        let width = Math.floor(height * aspectRatio);

        // If width is too wide, scale based on width instead
        if (width > screenWidth * 0.95) {
            width = Math.floor(screenWidth * 0.95);
            height = Math.floor(width / aspectRatio);
        }

        // Ensure dimensions are even numbers for pixel-perfect rendering
        width = Math.floor(width / 2) * 2;
        height = Math.floor(height / 2) * 2;

        this.canvas.width = width;
        this.canvas.height = height;

        // Update the context after resize
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false; // Keep pixel art crisp

        // Calculate view scaling
        // Show a more zoomed-in view (16 tiles wide instead of 24)
        const baseViewTiles = 16; // Show fewer tiles for more zoomed-in feel
        const scaleFactor = 1.0; // Keep consistent zoom level across screens
        
        this.scaleX = width / (this.TILE_SIZE * baseViewTiles);
        this.scaleY = this.scaleX; // Keep 1:1 pixel ratio for tiles
        
        // Update UI positions if needed
        if (this.onResize) {
            this.onResize(width, height);
        }
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        return {
            x: centerX + (x * this.TILE_SIZE * this.scaleX),
            y: centerY + (y * this.TILE_SIZE * this.scaleY)
        };
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        return {
            x: (x - centerX) / (this.TILE_SIZE * this.scaleX),
            y: (y - centerY) / (this.TILE_SIZE * this.scaleY)
        };
    }

    // Draw a tile at world coordinates
    drawTile(x, y, sprite) {
        const screen = this.worldToScreen(x, y);
        const size = this.TILE_SIZE * this.scaleX;

        if (sprite instanceof Image) {
            this.ctx.drawImage(
                sprite,
                screen.x - size / 2,
                screen.y - size / 2,
                size,
                size
            );
        } else {
            // Fallback to colored rectangle if no sprite
            this.ctx.fillStyle = sprite || '#666';
            this.ctx.fillRect(
                screen.x - size / 2,
                screen.y - size / 2,
                size,
                size
            );
        }
    }

    // Draw text with outline
    drawText(text, x, y, options = {}) {
        const {
            font = '16px Arial',
            fillStyle = '#fff',
            strokeStyle = '#000',
            strokeWidth = 3,
            align = 'center',
            baseline = 'middle'
        } = options;

        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;

        // Draw outline
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.strokeText(text, x, y);

        // Draw text
        this.ctx.fillStyle = fillStyle;
        this.ctx.fillText(text, x, y);
    }
}