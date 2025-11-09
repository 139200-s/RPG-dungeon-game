class HUD {
    static render(ctx, player) {
        // Render hotbar, health and buffs
        this.renderEquippedItems(ctx, player);
        this.renderBuffs(ctx, player);

        // Draw a lightweight minimap overlay (safe: will no-op if world data is missing)
        try {
            this.renderMiniMap(ctx, player);
        } catch (e) { /* ignore minimap errors to avoid breaking HUD */ }
            // If the world map overlay is open, render it above HUD
            try {
                if (window.WorldMap && window.WorldMap.isOpen) {
                    window.WorldMap.render(ctx, window.game);
                }
            } catch (e) { /* ignore WorldMap render errors */ }
    }

    static renderHealthBar(ctx, player) {
        const width = 200;
        const height = 20;
        const x = 20;
        const y = 20;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, width, height);

        // Health bar
        const healthPercent = player.hp / player.maxHp;
        ctx.fillStyle = this.getHealthColor(healthPercent);
        ctx.fillRect(x, y, width * healthPercent, height);

        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `${Math.ceil(player.hp)} / ${player.maxHp}`,
            x + width / 2,
            y + height / 2
        );
    }

    static renderEquippedItems(ctx, player) {
        // Draw hotbar centered at bottom of screen
        const slotSize = 48;
        const padding = 8;
        const totalSlots = 8; // two weapons, three potions, three abilities
        const totalWidth = totalSlots * slotSize + (totalSlots - 1) * padding;
        const startX = Math.round((ctx.canvas.width - totalWidth) / 2);
        const startY = ctx.canvas.height - slotSize - 30; // 30px from bottom

        // Draw health bar above hotbar
        this.renderHealthBarAboveHotbar(ctx, player, startX, startY, totalWidth, slotSize);

        // Render each slot in defined order
        const order = [
            { key: 'weaponSlot1', label: 'Weapon 1' },
            { key: 'weaponSlot2', label: 'Weapon 2' },
            { key: 'potion1', label: 'Potion 1' },
            { key: 'potion2', label: 'Potion 2' },
            { key: 'potion3', label: 'Potion 3' },
            { key: 'ability1', label: 'Ability 1' },
            { key: 'ability2', label: 'Ability 2' },
            { key: 'ability3', label: 'Ability 3' }
        ];

        for (let i = 0; i < order.length; i++) {
            const sx = startX + i * (slotSize + padding);
            const slotKey = order[i].key;
            const label = order[i].label;
            const item = player.inventory && player.inventory.equipment ? player.inventory.equipment[slotKey] : null;
            this.renderEquipmentSlot(ctx, sx, startY, slotSize, item, label, slotKey, player);
        }
    }

    static renderHealthBarAboveHotbar(ctx, player, hotbarX, hotbarY, hotbarWidth, slotSize) {
        const width = Math.min(400, hotbarWidth);
        const height = 22;
        const x = hotbarX + Math.round((hotbarWidth - width) / 2);
        const y = hotbarY - height - 10; // 10px gap above hotbar

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - 4, y - 4, width + 8, height + 8);

        // Health bar
        const healthPercent = Math.max(0, Math.min(1, player.hp / player.maxHp));
        ctx.fillStyle = this.getHealthColor(healthPercent);
        ctx.fillRect(x, y, width * healthPercent, height);

        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, x + width / 2, y + height / 2);
    }

    static renderEquipmentSlot(ctx, x, y, size, item, label, slotKey, player) {

        // Draw slot background
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, size, size);

        // Draw item if present
        if (item) {
            if (item.sprite) {
                ctx.drawImage(item.sprite, x, y, size, size);
            } else {
                ctx.fillStyle = '#666';
                ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
            }

            // Draw cooldown overlay if applicable
            if (item.cooldown && item.cooldown > 0) {
                const cooldownPercent = item.cooldown / item.maxCooldown;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(x, y + size * (1 - cooldownPercent), size, size * cooldownPercent);
            }
        }

    // Draw border and highlight if selected
    const isSelected = player && player.hotbarOrder && player.hotbarOrder[player.selectedHotbar] === slotKey;
    ctx.strokeStyle = isSelected ? '#ffd166' : '#000';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(x, y, size, size);

        // Draw label (small)
        ctx.fillStyle = '#fff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + size / 2, y + size + 14);

        // Draw key binding
        ctx.font = '10px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'left';
        ctx.fillText(this.getKeyBinding(label), x + 4, y + 12);
    }

    static renderBuffs(ctx, player) {
        const startX = 20;
        const startY = 100;
        const size = 30;
        const padding = 5;

        const buffs = player.getActiveBuffs();

        buffs.forEach((buff, index) => {
            const x = startX + (size + padding) * index;
            
            // Draw buff background
            ctx.fillStyle = this.getBuffColor(buff);
            ctx.fillRect(x, startY, size, size);

            // Draw duration
            const durationPercent = buff.duration / buff.maxDuration;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x, startY + size * (1 - durationPercent), size, size * durationPercent);

            // Draw border
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, startY, size, size);

            // Draw icon or symbol
            if (buff.icon) {
                ctx.drawImage(buff.icon, x + 5, startY + 5, size - 10, size - 10);
            } else {
                ctx.fillStyle = '#fff';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(buff.symbol || '?', x + size / 2, startY + size / 2);
            }
        });
    }

    static getHealthColor(percent) {
        if (percent > 0.6) return '#2ecc71'; // Green
        if (percent > 0.3) return '#f1c40f'; // Yellow
        return '#e74c3c'; // Red
    }

    static getBuffColor(buff) {
        switch (buff.type) {
            case 'healing': return 'rgba(46, 204, 113, 0.8)';
            case 'strength': return 'rgba(231, 76, 60, 0.8)';
            case 'speed': return 'rgba(52, 152, 219, 0.8)';
            case 'defense': return 'rgba(155, 89, 182, 0.8)';
            default: return 'rgba(149, 165, 166, 0.8)';
        }
    }

    // Lightweight minimap renderer (chunk/biome based, infinite world friendly)
    static renderMiniMap(ctx, player) {
        if (!player || !window.game || !window.game.worldGenerator) return;

        const wg = window.game.worldGenerator;
        const tileSize = 32;
        const chunkSize = wg.CHUNK_SIZE || 16; // tiles per chunk
        const sectionSize = wg.SECTION_SIZE || 5; // chunks per section

        const canvasW = ctx.canvas.width;
        const size = Math.min(260, Math.floor(canvasW * 0.2));
        const padding = 12;
        const x = canvasW - size - padding;
        const y = padding;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x, y, size, size);

        // How many chunks to show from center
        const viewRadius = 4; // shows (2*viewRadius+1)^2 chunks
        const gridCount = viewRadius * 2 + 1;
        const chunkPx = Math.max(4, Math.floor(size / gridCount));

        // Center chunk coordinates (global chunk indices)
        const centerChunkX = Math.floor(player.x / (tileSize * chunkSize));
        const centerChunkY = Math.floor(player.y / (tileSize * chunkSize));

        // Biome colors (fallback)
        const biomeColors = {
            NarrowTunnels: '#495057',
            OpenCaverns: '#6aa67a',
            CrystalDepths: '#5aaad6',
            MushroomCaverns: '#9a66b3',
            AbyssChasm: '#2b2b3a',
            ForgottenRuins: '#78776b',
            LavaHollows: '#883322',
            default: '#2f2f2f'
        };

        // Draw chunks grid
        for (let cy = -viewRadius; cy <= viewRadius; cy++) {
            for (let cx = -viewRadius; cx <= viewRadius; cx++) {
                const globalChunkX = centerChunkX + cx;
                const globalChunkY = centerChunkY + cy;

                // Resolve section and local chunk indices
                const sectionX = Math.floor(globalChunkX / sectionSize);
                const sectionY = Math.floor(globalChunkY / sectionSize);
                let localChunkX = globalChunkX - sectionX * sectionSize;
                let localChunkY = globalChunkY - sectionY * sectionSize;
                // wrap negatives
                if (localChunkX < 0) localChunkX += sectionSize;
                if (localChunkY < 0) localChunkY += sectionSize;

                const section = wg.getSection(sectionX, sectionY);
                let color = biomeColors.default;
                if (section && section.isGenerated) {
                    const chunk = section.getChunk(localChunkX, localChunkY);
                    if (chunk) {
                        try {
                            if (chunk.type && chunk.type === 'wall') color = '#444';
                            else if (chunk.type && chunk.type === 'water') color = '#235a7c';
                            else if (chunk.type && chunk.type === 'lava') color = '#7c2323';
                            else if (typeof section.getBiome === 'function') {
                                const biomeName = section.getBiome();
                                color = biomeColors[biomeName] || biomeColors.default;
                            }
                        } catch (e) { /* ignore per-chunk failures */ }
                    } else {
                        // section present but chunk missing
                        try { const biomeName = section.getBiome(); color = biomeColors[biomeName] || biomeColors.default; } catch (e) {}
                    }
                }

                const sx = x + size / 2 + cx * chunkPx - chunkPx/2;
                const sy = y + size / 2 + cy * chunkPx - chunkPx/2;

                ctx.fillStyle = color;
                ctx.fillRect(Math.round(sx), Math.round(sy), chunkPx, chunkPx);
                // dim border for visibility
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.round(sx)+0.5, Math.round(sy)+0.5, chunkPx-1, chunkPx-1);
            }
        }

        // Draw entities aggregated to chunk centers
        const entities = [];
        if (window.game.activeEnemies) entities.push(...Array.from(window.game.activeEnemies));
        if (window.game.activeBosses) entities.push(...Array.from(window.game.activeBosses));
        if (window.game.items) entities.push(...window.game.items.filter(it=>it && typeof it.x==='number'));

        ctx.save();
        for (const e of entities) {
            const ecx = Math.floor(e.x / (tileSize * chunkSize)) - centerChunkX;
            const ecy = Math.floor(e.y / (tileSize * chunkSize)) - centerChunkY;
            if (Math.abs(ecx) > viewRadius || Math.abs(ecy) > viewRadius) continue;
            const sx = x + size / 2 + ecx * chunkPx;
            const sy = y + size / 2 + ecy * chunkPx;
            ctx.fillStyle = e.isBoss ? '#ff5555' : '#ffd166';
            ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, chunkPx/4), 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

        // Player marker (center)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x + size/2, y + size/2, Math.max(3, chunkPx/3), 0, Math.PI*2); ctx.fill();

        // Draw border
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        // Draw coordinates and biome under the minimap
        const tileX = Math.floor(player.x / tileSize);
        const tileY = Math.floor(player.y / tileSize);
        const chunkX = centerChunkX;
        const chunkY = centerChunkY;

        // Determine biome name for current chunk
        let biomeName = 'Unknown';
        try {
            const secX = Math.floor(chunkX / sectionSize);
            const secY = Math.floor(chunkY / sectionSize);
            const locX = chunkX - secX * sectionSize;
            const locY = chunkY - secY * sectionSize;
            const sec = wg.getSection(secX, secY);
            if (sec && typeof sec.getBiome === 'function') biomeName = sec.getBiome();
        } catch (e) { /* ignore */ }

        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Tile: ${tileX}, ${tileY}`, x, y + size + 16);
        ctx.fillText(`Chunk: ${chunkX}, ${chunkY}`, x, y + size + 32);
        ctx.fillStyle = biomeColors[biomeName] || '#fff';
        ctx.fillText(`Biome: ${biomeName}`, x, y + size + 48);
    }

    static getKeyBinding(slot) {
        // Map human labels to input action keys
        const labelToAction = {
            'Weapon 1': 'weaponSlot1',
            'Weapon 2': 'weaponSlot2',
            'Potion 1': 'potion1',
            'Potion 2': 'potion2',
            'Potion 3': 'potion3',
            'Ability 1': 'ability1',
            'Ability 2': 'ability2',
            'Ability 3': 'ability3'
        };

        const actionName = labelToAction[slot];
        if (!actionName || !window.game || !window.game.input) return '';

        const keys = window.game.input.actions.get(actionName) || [];
        const fmt = (k) => {
            if (!k) return '';
            if (k.startsWith('mouse')) {
                const b = k.slice(5);
                return b === '0' ? 'LMB' : (b === '1' ? 'RMB' : `M${b}`);
            }
            if (k === ' ') return 'Space';
            return String(k).toUpperCase();
        };

        return keys.map(fmt).join(' / ');
    }
}