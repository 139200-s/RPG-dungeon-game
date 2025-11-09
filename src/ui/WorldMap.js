class WorldMap {
    // Simple full-screen world map overlay with click-and-drag panning
    static isOpen = false;
    static offsetX = 0; // pixels
    static offsetY = 0;
    static scale = 1.0; // zoom multiplier
    static dragging = false;
    static dragStart = null;
    static lastMouse = null;

    static toggle() {
        if (this.isOpen) this.close(); else this.open();
    }

    static open() {
        this.isOpen = true;
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.cursor = 'grab';
            canvas.addEventListener('mousedown', this._onMouseDown);
            canvas.addEventListener('mouseup', this._onMouseUp);
            canvas.addEventListener('mousemove', this._onMouseMove);
            canvas.addEventListener('wheel', this._onWheel, { passive: false });
        }
    }

    static close() {
        this.isOpen = false;
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.cursor = 'default';
            canvas.removeEventListener('mousedown', this._onMouseDown);
            canvas.removeEventListener('mouseup', this._onMouseUp);
            canvas.removeEventListener('mousemove', this._onMouseMove);
            canvas.removeEventListener('wheel', this._onWheel);
        }
        // reset drag state
        this.dragging = false;
        this.dragStart = null;
        this.lastMouse = null;
    }

    static _onMouseDown = (e) => {
        if (!this.isOpen) return;
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        this.dragging = true;
        this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
    }

    static _onMouseUp = (e) => {
        if (!this.isOpen) return;
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        // If mouseUp happened without dragging far, treat as click recentre
        if (!this.dragStart) { this.dragging = false; return; }
        const dx = mouse.x - this.dragStart.x;
        const dy = mouse.y - this.dragStart.y;
        if (Math.hypot(dx, dy) < 6) {
            // center map on clicked position: compute world offset so clicked point becomes center
            const engine = window.game;
            if (!engine || !engine.worldGenerator) return;
            const wg = engine.worldGenerator;
            const tileSize = 32;
            const chunkSize = wg.CHUNK_SIZE || 16;
            const sectionSize = wg.SECTION_SIZE || 5;

            // compute clicked world offset relative to center
            const canvasCenter = { x: canvas.width / 2, y: canvas.height / 2 };
            const clickDeltaX = (mouse.x - canvasCenter.x) / (this.scale);
            const clickDeltaY = (mouse.y - canvasCenter.y) / (this.scale);

            this.offsetX += clickDeltaX;
            this.offsetY += clickDeltaY;
        }

        this.dragging = false;
        this.dragStart = null;
        canvas.style.cursor = 'grab';
        e.preventDefault();
    }

    static _onMouseMove = (e) => {
        if (!this.isOpen || !this.dragging) return;
        const canvas = document.getElementById('gameCanvas');
        if (!canvas || !this.dragStart) return;
        const rect = canvas.getBoundingClientRect();
        const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const dx = mouse.x - this.dragStart.x;
        const dy = mouse.y - this.dragStart.y;
        // apply inverse because dragging moves the map
        this.offsetX += dx / this.scale;
        this.offsetY += dy / this.scale;
        this.dragStart = mouse;
        e.preventDefault();
    }

    static _onWheel = (e) => {
        if (!this.isOpen) return;
        // zoom in/out
        const delta = Math.sign(e.deltaY);
        if (delta > 0) this.scale = Math.max(0.25, this.scale * 0.9);
        else this.scale = Math.min(4, this.scale * 1.1);
        e.preventDefault();
    }

    static render(ctx, engine) {
        if (!this.isOpen) return;
        const canvas = ctx.canvas;
        // Dark overlay
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw map area
        const wg = (engine && engine.worldGenerator) ? engine.worldGenerator : (window.game && window.game.worldGenerator);
        if (!wg) {
            ctx.fillStyle = '#fff';
            ctx.font = '18px monospace';
            ctx.fillText('World generator not available', 40, 80);
            ctx.restore();
            return;
        }

        const tileSize = 32;
        const chunkSize = wg.CHUNK_SIZE || 16;
        const sectionSize = wg.SECTION_SIZE || 5;

        // Determine center based on player
        const player = engine && engine.player ? engine.player : (window.game && window.game.player);
        const centerWorldX = player ? player.x : 0;
        const centerWorldY = player ? player.y : 0;

        // Convert center to section coordinates
        const centerSectionX = Math.floor((centerWorldX / tileSize) / (chunkSize * sectionSize));
        const centerSectionY = Math.floor((centerWorldY / tileSize) / (chunkSize * sectionSize));

        // Determine how many sections to draw depending on canvas and scale
        const sectionPx = Math.max(8, Math.floor(48 * this.scale));
        const cols = Math.ceil(canvas.width / sectionPx) + 4;
        const rows = Math.ceil(canvas.height / sectionPx) + 4;
        const halfCols = Math.ceil(cols / 2);
        const halfRows = Math.ceil(rows / 2);

        // Offset in pixels applied after scaling
        const centerScreen = { x: canvas.width / 2, y: canvas.height / 2 };

        // Draw section grid
        for (let sy = -halfRows; sy <= halfRows; sy++) {
            for (let sx = -halfCols; sx <= halfCols; sx++) {
                const secX = centerSectionX + sx;
                const secY = centerSectionY + sy;
                const sec = wg.getSection(secX, secY);
                let color = '#2f2f2f';
                if (sec && sec.isGenerated) {
                    try {
                        const b = sec.getBiome();
                        // small map of biome colors
                        const biomeColors = {
                            NarrowTunnels: '#495057',
                            OpenCaverns: '#6aa67a',
                            CrystalDepths: '#5aaad6',
                            MushroomCaverns: '#9a66b3',
                            AbyssChasm: '#2b2b3a',
                            ForgottenRuins: '#78776b',
                            LavaHollows: '#883322'
                        };
                        color = biomeColors[b] || color;
                    } catch (e) { }
                }

                // Compute screen pos
                const worldOffsetX = sx * sectionPx * 1;
                const worldOffsetY = sy * sectionPx * 1;
                const screenX = Math.round(centerScreen.x + (worldOffsetX + this.offsetX) * this.scale - sectionPx/2);
                const screenY = Math.round(centerScreen.y + (worldOffsetY + this.offsetY) * this.scale - sectionPx/2);

                ctx.fillStyle = color;
                ctx.fillRect(screenX, screenY, Math.max(1, Math.round(sectionPx * this.scale)), Math.max(1, Math.round(sectionPx * this.scale)));
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.strokeRect(screenX + 0.5, screenY + 0.5, Math.max(1, Math.round(sectionPx * this.scale))-1, Math.max(1, Math.round(sectionPx * this.scale))-1);
            }
        }

        // Draw player marker at center
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(centerScreen.x, centerScreen.y, 6, 0, Math.PI*2); ctx.fill();

        // Draw instructions
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('M: Close | Drag to pan | Wheel to zoom', 16, canvas.height - 20);

        ctx.restore();
    }
}

// Expose globally so GameEngine/HUD can reference it
window.WorldMap = WorldMap;
