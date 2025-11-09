class Player {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.x = 0;
        this.y = 0;
        this.speed = 500; // Increased by 10x
        this.direction = 0; // Angle in radians
        
        // Stats
        this.level = 1;
        this.exp = 0;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.baseStrength = 10;
        this.baseDefense = 5;
        
        // Systems
        this.inventory = new Inventory(this);
        
        // Animation state
        this.currentAnimation = 'idle';
        this.animationFrame = 0;
        this.animationTime = 0;
        this.animations = {
            idle: { frames: 4, speed: 0.1 },
            walk: { frames: 8, speed: 0.08 },
            attack: { frames: 6, speed: 0.05 }
        };
        
        // Combat state
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.invulnerableTime = 0;
        this.isInvulnerable = false;
        
        // Active effects
        this.buffs = new Map();

        // Hotbar / quickslots
        // Order: two weapons, three potions, three abilities
        this.hotbarOrder = [
            'weaponSlot1', 'weaponSlot2',
            'potion1', 'potion2', 'potion3',
            'ability1', 'ability2', 'ability3'
        ];
        this.selectedHotbar = 0; // index into hotbarOrder
        
        // Load assets
        this.loadAssets();
    }

    loadAssets() {
        // Animation definitions with frames and timing
        this.animations = {
            idle: { frames: 4, speed: 0.15 },  // Slower idle animation
            walk: { frames: 8, speed: 0.08 },  // Fast walk cycles
            attack: { frames: 6, speed: 0.05 }, // Quick attack
            hit: { frames: 3, speed: 0.1 }     // Brief hit reaction
        };

        // Initialize sprite arrays
        this.sprites = {
            idle: [], walk: [], attack: [], hit: []
        };

        // Try to use TextureManager for sprites
        try {
            if (this.gameEngine?.textureManager) {
                Object.keys(this.animations).forEach(anim => {
                    const frameCount = this.animations[anim].frames;
                    for (let i = 0; i < frameCount; i++) {
                        const key = `player_${anim}_${i}`;
                        const texture = this.gameEngine.textureManager.getTexture(key);
                        if (texture) {
                            this.sprites[anim][i] = texture;
                        }
                    }

                    // If any frames are missing, regenerate all frames for this animation
                    if (this.sprites[anim].length !== frameCount) {
                        this.sprites[anim] = [];
                        for (let i = 0; i < frameCount; i++) {
                            const canvas = document.createElement('canvas');
                            canvas.width = canvas.height = 32;
                            const ctx = canvas.getContext('2d');
                            
                            // Dark background for better visibility
                            ctx.fillStyle = '#1a1a1a';
                            ctx.fillRect(0, 0, 32, 32);
                            
                            // Base color by animation type
                            const colors = {
                                idle: '#ac3232',    // Deep red
                                walk: '#d77643',    // Warm orange
                                attack: '#df7126',  // Bright orange
                                hit: '#d95763'      // Pink flash
                            };
                            ctx.fillStyle = colors[anim] || '#ff0000';
                            
                            // Common character base
                            const bounceOffset = anim === 'walk' ? Math.sin(i * Math.PI/4) * 2 : 0;
                            ctx.fillRect(12, 8 + bounceOffset, 8, 16);  // Torso
                            
                            // Animation-specific details
                            ctx.fillStyle = '#ffffff';
                            switch(anim) {
                                case 'idle':
                                    // Breathing animation
                                    const breathe = Math.sin(i * Math.PI/2) * 0.5;
                                    ctx.fillRect(13, 6 + breathe, 6, 6);  // Head
                                    // Arms at rest
                                    ctx.fillRect(10, 12, 3, 8);  // Left arm
                                    ctx.fillRect(19, 12, 3, 8);  // Right arm
                                    break;
                                    
                                case 'walk':
                                    // Head
                                    ctx.fillRect(13, 6 + bounceOffset, 6, 6);
                                    // Arms swinging
                                    const armSwing = Math.sin(i * Math.PI/4) * 4;
                                    ctx.fillRect(10, 12 - armSwing, 3, 8);  // Left
                                    ctx.fillRect(19, 12 + armSwing, 3, 8);  // Right
                                    // Legs moving
                                    const legSwing = Math.cos(i * Math.PI/4) * 4;
                                    ctx.fillRect(13, 24 + legSwing, 3, 8);  // Left
                                    ctx.fillRect(16, 24 - legSwing, 3, 8);  // Right
                                    break;
                                    
                                case 'attack':
                                    // Head
                                    ctx.fillRect(13, 6, 6, 6);
                                    // Attack arm extension
                                    const attackReach = i * 4;
                                    ctx.fillRect(20 + attackReach, 12, 8 - attackReach, 4);
                                    // Stable stance
                                    ctx.fillRect(13, 24, 3, 8);  // Left leg
                                    ctx.fillRect(16, 24, 3, 8);  // Right leg
                                    break;
                                    
                                case 'hit':
                                    // Flash effect
                                    ctx.fillStyle = `rgba(255,255,255,${0.8 - i * 0.2})`;
                                    ctx.fillRect(0, 0, 32, 32);
                                    break;
                            }
                            
                            // Add subtle shading
                            ctx.fillStyle = 'rgba(0,0,0,0.2)';
                            ctx.fillRect(12, 20, 8, 4);
                            
                            this.sprites[anim][i] = canvas;
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('Player texture loading error:', e);
        }

        // Ensure there's always a simple default sprite (32x32) so the player is visible
        if (!this.defaultSprite) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 32;
            const ctx = canvas.getContext('2d');

            // Background/backdrop for visibility
            ctx.fillStyle = '#0f1724';
            ctx.fillRect(0, 0, 32, 32);

            // Simple humanoid: head + torso
            ctx.fillStyle = '#4a90e2'; // body color
            ctx.fillRect(12, 10, 8, 12); // torso
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(16, 6, 4, 0, Math.PI * 2); // head
            ctx.fill();

            // Slight shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(12, 20, 8, 3);

            this.defaultSprite = canvas;

            // Fill any missing animation frames with the default sprite
            Object.keys(this.animations).forEach(anim => {
                const frames = this.animations[anim].frames;
                this.sprites[anim] = this.sprites[anim] || [];
                for (let i = 0; i < frames; i++) {
                    if (!this.sprites[anim][i]) this.sprites[anim][i] = this.defaultSprite;
                }
            });
        }
    }

    update(deltaTime) {
        this.updateMovement(deltaTime);
        this.updateAnimation(deltaTime);
        this.updateCombat(deltaTime);
        this.updateBuffs(deltaTime);
    }

    updateMovement(deltaTime) {
        // Delegate to centralized movement logic (see src/systems/movement.js)
        try {
            if (window.Movement && typeof window.Movement.updatePlayerMovement === 'function') {
                window.Movement.updatePlayerMovement(this, deltaTime);
                return;
            }
        } catch (e) { /* fall back to local implementation below on error */ }

        // Fallback local movement implementation
        const input = this.gameEngine.input.getMovementVector();
        const prevTileX = Math.floor(this.x / 32);
        const prevTileY = Math.floor(this.y / 32);

        if (input.dx !== 0 || input.dy !== 0) {
            this.direction = Math.atan2(input.dy, input.dx);
            const nextX = this.x + input.dx * this.speed * deltaTime;
            const nextY = this.y + input.dy * this.speed * deltaTime;
            if (!this.checkCollision(nextX, this.y)) this.x = nextX;
            if (!this.checkCollision(this.x, nextY)) this.y = nextY;
            this.currentAnimation = 'walk';
        } else {
            this.currentAnimation = 'idle';
        }

        // Handle tile enter/exit effects and hazard damage
        try {
            const tileX = Math.floor(this.x / 32);
            const tileY = Math.floor(this.y / 32);
            const world = this.gameEngine.world;
            const newTile = world ? world.getTile(tileX, tileY) : null;
            const prevTile = world ? world.getTile(prevTileX, prevTileY) : null;

            // Call onExit for previous tile if we left it
            if (prevTile && (prevTileX !== tileX || prevTileY !== tileY)) {
                try { if (typeof prevTile.onExit === 'function') prevTile.onExit(this); } catch (e) {}
            }

            // Call onEnter for new tile when we step onto it
            if (newTile && (prevTileX !== tileX || prevTileY !== tileY)) {
                try { if (typeof newTile.onEnter === 'function') newTile.onEnter(this); } catch (e) {}
            }

            // Apply periodic hazard damage (e.g., lava)
            if (newTile && newTile.damage) {
                this._hazardTimer = (this._hazardTimer || 0) - deltaTime;
                if (this._hazardTimer <= 0) {
                    try { this.takeDamage(newTile.damage, null); } catch (e) {}
                    this._hazardTimer = 0.5; // apply damage every 0.5s while standing
                }
            } else {
                this._hazardTimer = 0;
            }
        } catch (e) { /* ignore tile effect errors */ }
    }

    updateAnimation(deltaTime) {
        const animation = this.animations[this.currentAnimation];
        
        this.animationTime += deltaTime;
        if (this.animationTime >= animation.speed) {
            this.animationTime = 0;
            this.animationFrame = (this.animationFrame + 1) % animation.frames;
        }
    }

    updateCombat(deltaTime) {
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Update invulnerability
        if (this.invulnerableTime > 0) {
            this.invulnerableTime -= deltaTime;
            if (this.invulnerableTime <= 0) {
                this.isInvulnerable = false;
            }
        }

        // Check for attack input
        if (this.gameEngine.input.isActionPressed('attack') && this.attackCooldown <= 0) {
            try {
                if (window.Attacks && typeof window.Attacks.playerAttack === 'function') {
                    window.Attacks.playerAttack(this);
                } else {
                    this.attack();
                }
            } catch (e) {
                // Fallback to local attack implementation
                this.attack();
            }
        }
    }

    updateBuffs(deltaTime) {
        for (const [id, buff] of this.buffs.entries()) {
            buff.duration -= deltaTime;
            if (buff.duration <= 0) {
                this.removeBuff(id);
            }
        }
    }

    attack() {
        // Local fallback attack implementation (kept for compatibility)
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.currentAnimation = 'attack';
        this.animationFrame = 0;
        this.attackCooldown = 0.5;

        const weapon = (this.inventory && typeof this.inventory.getEquippedWeapons === 'function') ? this.inventory.getEquippedWeapons()[0] : (this.inventory && this.inventory.equipment ? this.inventory.equipment.weaponSlot1 : null);
        if (!weapon) {
            setTimeout(() => { this.isAttacking = false; if (!this.gameEngine.input.getMovementVector().isMoving) this.currentAnimation = 'idle'; }, 300);
            return;
        }

        const attackRange = weapon.range || 1;
        const attackAngle = Math.PI / 3;
        const hits = this.gameEngine.getEntitiesInArc(
            this.x, this.y, attackRange,
            this.direction - attackAngle / 2,
            this.direction + attackAngle / 2
        );

        for (const target of hits) {
            try {
                if (window.Attacks && typeof window.Attacks.dealDamage === 'function') {
                    window.Attacks.dealDamage(this, target, weapon);
                } else {
                    const damage = this.calculateDamage(weapon);
                    target.takeDamage(damage, this);
                }
            } catch (e) { /* ignore per-target errors */ }
        }

        setTimeout(() => {
            this.isAttacking = false;
            if (!this.gameEngine.input.getMovementVector().isMoving) this.currentAnimation = 'idle';
        }, 500);
    }

    dealDamage(target, weapon) {
        // Keep API but delegate to Attacks when available
        try {
            if (window.Attacks && typeof window.Attacks.dealDamage === 'function') {
                window.Attacks.dealDamage(this, target, weapon);
                return;
            }
        } catch (e) { /* fall through to local */ }

        const damage = this.calculateDamage(weapon);
        target.takeDamage(damage, this);
    }

    calculateDamage(weapon) {
        // Delegate to Attacks.calculateDamage when present
        try {
            if (window.Attacks && typeof window.Attacks.calculateDamage === 'function') {
                return window.Attacks.calculateDamage(this, weapon);
            }
        } catch (e) { /* fall through */ }

        let damage = (weapon && weapon.damage) ? weapon.damage : 0;
        damage += this.getStrength();

        if (Math.random() < this.getCriticalChance()) damage *= 1.5;

        for (const buff of this.buffs.values()) {
            if (buff.type === 'damage') damage *= buff.multiplier;
        }

        return Math.floor(damage);
    }

    takeDamage(amount, source) {
        if (this.invulnerableTime > 0 || this.isInvulnerable) return 0;

        // Apply defense
        const defense = this.getDefense();
        let damage = Math.max(1, amount - defense);

        // Apply damage reduction buffs
        for (const buff of this.buffs.values()) {
            if (buff.type === 'defense') {
                damage *= (1 - buff.reduction);
            }
        }

        damage = Math.floor(damage);
        this.hp = Math.max(0, this.hp - damage);

        // Trigger invulnerability frames
        this.invulnerableTime = 0.5; // 500ms

        // Check death
        if (this.hp <= 0) {
            this.die();
        }

        return damage;
    }

    die() {
        this.gameEngine.onPlayerDeath();
    }

    isAlive() {
        return this.hp > 0;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    // Cycle/select hotbar slots (wheel input passes offset +1 or -1)
    selectHotbarOffset(offset) {
        if (!this.hotbarOrder || this.hotbarOrder.length === 0) return;
        const len = this.hotbarOrder.length;
        // offset is 1 or -1 typically; invert sign so wheel-up -> previous (nice feel)
        const delta = offset;
        this.selectedHotbar = (this.selectedHotbar + delta + len) % len;
        // Optionally: auto-use if scrolling selects a potion? For now just change selection
    }

    // Use the currently selected hotbar item (left-click binds here)
    useSelectedItem() {
        const slotKey = this.hotbarOrder && this.hotbarOrder[this.selectedHotbar];
        if (!slotKey) return false;

        const item = this.inventory && this.inventory.equipment ? this.inventory.equipment[slotKey] : null;
        if (!item) return false;

        try {
            // If the item has a custom use method, call it
            if (typeof item.use === 'function') {
                item.use(this);
                return true;
            }

            // Fallback: handle potions by type
            if (item.type === 'potion') {
                // Simple default: heal a fixed amount, then remove from slot
                this.heal(item.potency || 50);
                // Remove the potion from equipment
                this.inventory.equipment[slotKey] = null;
                return true;
            }

            // For weapons/abilities, trigger an attack or ability
            if (item.type === 'weapon') {
                this.attack();
                return true;
            }
        } catch (e) {
            console.error('useSelectedItem error:', e);
        }

        return false;
    }

    addBuff(buff) {
        this.buffs.set(buff.id, buff);
    }

    removeBuff(buffId) {
        this.buffs.delete(buffId);
    }

    getActiveBuffs() {
        return Array.from(this.buffs.values());
    }

    checkCollision(x, y) {
        // Get nearby chunks
        const chunks = this.gameEngine.getNearbyChunks(x, y);
        
        // Check collision with walls and obstacles
        for (const chunk of chunks) {
            if (chunk.hasCollisionAt(x, y)) {
                return true;
            }
        }
        
        return false;
    }

    // Stat calculations
    getStrength() {
        let strength = this.baseStrength;
        
        // Add equipment bonuses (be defensive: inventory may be a plain object when loading saves)
        let equipped = [];
        try {
            if (this.inventory) {
                if (typeof this.inventory.getEquippedItems === 'function') {
                    equipped = this.inventory.getEquippedItems() || [];
                } else if (this.inventory.equipment) {
                    equipped = Object.values(this.inventory.equipment).filter(Boolean);
                }
            }
        } catch (e) { equipped = []; }

        for (const item of equipped) {
            if (item && item.stats && item.stats.strength) {
                strength += item.stats.strength;
            }
        }
        
        // Add buff bonuses
        for (const buff of this.buffs.values()) {
            if (buff.type === 'strength') {
                strength *= buff.multiplier;
            }
        }
        
        return Math.floor(strength);
    }

    getDefense() {
        let defense = this.baseDefense;
        
        // Add equipment bonuses (defensive: support plain equipment objects)
        let equipped = [];
        try {
            if (this.inventory) {
                if (typeof this.inventory.getEquippedItems === 'function') {
                    equipped = this.inventory.getEquippedItems() || [];
                } else if (this.inventory.equipment) {
                    equipped = Object.values(this.inventory.equipment).filter(Boolean);
                }
            }
        } catch (e) { equipped = []; }

        for (const item of equipped) {
            if (item && item.stats && item.stats.defense) {
                defense += item.stats.defense;
            }
        }
        
        // Add buff bonuses
        for (const buff of this.buffs.values()) {
            if (buff.type === 'defense') {
                defense *= buff.multiplier;
            }
        }
        
        return Math.floor(defense);
    }

    getCriticalChance() {
        let chance = 0.05; // Base 5% crit chance
        
        // Add equipment bonuses (defensive)
        let equipped = [];
        try {
            if (this.inventory) {
                if (typeof this.inventory.getEquippedItems === 'function') {
                    equipped = this.inventory.getEquippedItems() || [];
                } else if (this.inventory.equipment) {
                    equipped = Object.values(this.inventory.equipment).filter(Boolean);
                }
            }
        } catch (e) { equipped = []; }

        for (const item of equipped) {
            if (item && item.stats && item.stats.criticalChance) {
                chance += item.stats.criticalChance;
            }
        }
        
        return Math.min(1, chance);
    }

    // Level and experience
    gainExperience(amount) {
        this.exp += amount;
        
        // Check for level up
        const nextLevelExp = this.getNextLevelExp();
        while (this.exp >= nextLevelExp) {
            this.levelUp();
        }
    }

    getNextLevelExp() {
        return Math.floor(100 * Math.pow(1.5, this.level - 1));
    }

    levelUp() {
        this.level++;
        this.exp -= this.getNextLevelExp();
        
        // Increase stats
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.baseStrength += 2;
        this.baseDefense += 1;
        
        this.gameEngine.onPlayerLevelUp(this);
    }

    // Accept optional camera parameter (GameEngine may pass it)
    render(ctx, camera) {
        const cam = camera || this.gameEngine.camera;
        // Calculate screen position (player coordinates are in pixels)
        const screenPos = cam.worldToScreen(this.x, this.y);
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenPos.x, screenPos.y + 28,
            20, 10, 0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw player sprite using texture manager or fallback
        const sprite = this.getSprite();
        if (sprite) {
            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            // Rotate only for non-topdown sprites; keep small rotation to indicate facing
            try { ctx.rotate(this.direction); } catch (e) { /* ignore */ }

            // Flash when invulnerable
            if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime * 10) % 2) {
                ctx.globalAlpha = 0.5;
            }

            // If sprite is an Image or Canvas, draw it scaled to 32x32
            try {
                ctx.drawImage(sprite, -16, -16, 32, 32);
            } catch (e) {
                // If sprite is not drawImage compatible, draw a fallback rect
                ctx.fillStyle = '#f00';
                ctx.fillRect(-16, -16, 32, 32);
            }

            ctx.restore();
        } else {
            // Fallback rectangle
            ctx.fillStyle = '#f00';
            ctx.fillRect(screenPos.x - 16, screenPos.y - 16, 32, 32);
        }
    }

    getSprite() {
        const arr = this.sprites[this.currentAnimation] || [];
        return arr[this.animationFrame] || this.defaultSprite;
    }

    // Save/Load
    save() {
        return {
            position: { x: this.x, y: this.y },
            stats: {
                level: this.level,
                exp: this.exp,
                hp: this.hp,
                maxHp: this.maxHp,
                baseStrength: this.baseStrength,
                baseDefense: this.baseDefense
            },
            inventory: this.inventory.save()
        };
    }

    load(data) {
        this.x = data.position.x;
        this.y = data.position.y;
        
        this.level = data.stats.level;
        this.exp = data.stats.exp;
        this.hp = data.stats.hp;
        this.maxHp = data.stats.maxHp;
        this.baseStrength = data.stats.baseStrength;
        this.baseDefense = data.stats.baseDefense;
        
        this.inventory.load(data.inventory);
    }
}