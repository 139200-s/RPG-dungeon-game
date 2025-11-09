class Boss extends Entity {
    constructor(type, section) {
        super(0, 0); // Initialize with 0,0 position
        this.type = type;
        this.section = section;
        // Keep a direct reference to the game engine when available to avoid repeated lookups
        this.gameEngine = (section && (section.gameEngine || (section.worldGenerator && section.worldGenerator.gameEngine))) || null;
        this.id = `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Initialize based on type
        this.initializeStats();
        this.initializeAttacks();
        this.initializeAnimations();
        this.initializeColors();

        // State
        this.direction = 0;
        this.currentAnimation = 'idle';
        this.animationFrame = 0;
        this.animationTime = 0;
        this.isAttacking = false;
        this.currentAttack = null;
        this.attackCooldown = 0;

        // Set position method from Entity
        this.setPosition = (x, y) => {
            this.x = x * 32; // Convert grid coordinates to pixel coordinates
            this.y = y * 32;
        };
    }

    initializeStats() {
        // Set size and stats based on boss type
        switch (this.type) {
            case 'mini':
                this.size = { width: 2, height: 2 };
                this.maxHp = 200;
                this.strength = 15;
                this.defense = 8;
                break;
            case 'small':
                this.size = { width: 2, height: 2 };
                this.maxHp = 400;
                this.strength = 25;
                this.defense = 12;
                break;
            case 'medium':
                this.size = { width: 3, height: 3 };
                this.maxHp = 800;
                this.strength = 35;
                this.defense = 18;
                break;
            case 'large':
                this.size = { width: 4, height: 4 };
                this.maxHp = 1500;
                this.strength = 50;
                this.defense = 25;
                break;
        }

        this.hp = this.maxHp;
    }

    initializeAttacks() {
        this.attacks = {
            meleeSlash: {
                name: 'Melee Slash',
                damage: this.strength * 1.0,
                range: 1.5,
                cooldown: 2,
                animation: 'slash'
            },
            heavySmash: {
                name: 'Heavy Smash',
                damage: this.strength * 1.8,
                range: 2,
                cooldown: 4,
                animation: 'smash'
            },
            dash: {
                name: 'Dash Attack',
                damage: this.strength * 1.2,
                range: 4,
                cooldown: 5,
                animation: 'dash'
            },
            aoeBlast: {
                name: 'AoE Blast',
                damage: this.strength * 0.8,
                range: 3,
                cooldown: 6,
                animation: 'blast'
            },
            projectile: {
                name: 'Projectile',
                damage: this.strength * 0.7,
                range: 6,
                cooldown: 3,
                animation: 'shoot'
            },
            spin: {
                name: 'Spin Attack',
                damage: this.strength * 1.1,
                range: 2,
                cooldown: 5,
                animation: 'spin'
            },
            grab: {
                name: 'Grab and Throw',
                damage: this.strength * 1.5,
                range: 1,
                cooldown: 7,
                animation: 'grab'
            },
            ultimate: {
                name: 'Ultimate',
                damage: this.strength * 2.5,
                range: 4,
                cooldown: 15,
                animation: 'ultimate'
            }
        };

        // Assign attacks based on boss type
        switch (this.type) {
            case 'mini':
                this.availableAttacks = ['meleeSlash', 'heavySmash'];
                break;
            case 'small':
                this.availableAttacks = ['meleeSlash', 'dash', 'projectile'];
                break;
            case 'medium':
                this.availableAttacks = ['meleeSlash', 'heavySmash', 'aoeBlast', 'spin', 'projectile'];
                break;
            case 'large':
                this.availableAttacks = ['meleeSlash', 'heavySmash', 'aoeBlast', 'spin', 'grab', 'ultimate'];
                break;
        }
    }

    initializeAnimations() {
        this.animations = {
            idle: { frames: 4, speed: 0.15 },
            walk: { frames: 8, speed: 0.12 },
            slash: { frames: 6, speed: 0.08 },
            smash: { frames: 8, speed: 0.1 },
            dash: { frames: 6, speed: 0.06 },
            blast: { frames: 10, speed: 0.08 },
            shoot: { frames: 6, speed: 0.08 },
            spin: { frames: 8, speed: 0.06 },
            grab: { frames: 8, speed: 0.08 },
            ultimate: { frames: 12, speed: 0.1 },
            death: { frames: 10, speed: 0.12 }
        };

        // Placeholder for actual sprite loading
        this.sprites = {};
        for (const anim in this.animations) {
            this.sprites[anim] = Array(this.animations[anim].frames).fill(null);
        }
    }

    initializeColors() {
        // Generate random colors for customizable parts
        const random = this.section.worldGenerator.seededRandom(this.id);
        
        this.colors = {
            skin: this.generateColor(random()),
            armor: this.generateColor(random()),
            weapon: this.generateColor(random()),
            details: this.generateColor(random()),
            effects: this.generateColor(random())
        };
    }

    generateColor(seed) {
        const h = seed * 360;
        const s = 30 + seed * 40;
        const l = 40 + seed * 20;
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    update(deltaTime) {
        this.updateAnimation(deltaTime);
        this.updateCombat(deltaTime);
        this.updateMovement(deltaTime);
    }

    updateAnimation(deltaTime) {
        const animation = this.animations[this.currentAnimation];
        if (!animation) return;

        this.animationTime += deltaTime;
        if (this.animationTime >= animation.speed) {
            this.animationTime = 0;
            this.animationFrame = (this.animationFrame + 1) % animation.frames;

            // Check for animation completion
            if (this.isAttacking && this.animationFrame === 0) {
                this.completeAttack();
            }
        }
    }

    updateCombat(deltaTime) {
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Try to attack if not already attacking
        if (!this.isAttacking && this.attackCooldown <= 0) {
            this.chooseAndExecuteAttack();
        }
    }

    updateMovement(deltaTime) {
        if (this.isAttacking) return;

        // Get target (player) position
        const player = (this.gameEngine && this.gameEngine.player) || (this.section && this.section.gameEngine && this.section.gameEngine.player) || (window.game && window.game.player);
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Update direction
        this.direction = Math.atan2(dy, dx);

        // Move if not in attack range
        const minAttackRange = Math.min(...this.availableAttacks.map(name => this.attacks[name].range));
        if (distance > minAttackRange) {
            const speed = 2; // Units per second
            const movement = speed * deltaTime;
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;

            // Check collision before moving
            const nextX = this.x + normalizedDx * movement;
            const nextY = this.y + normalizedDy * movement;

            if (!this.checkCollision(nextX, this.y)) {
                this.x = nextX;
            }
            if (!this.checkCollision(this.x, nextY)) {
                this.y = nextY;
            }

            this.currentAnimation = 'walk';
        } else {
            this.currentAnimation = 'idle';
        }
    }

    chooseAndExecuteAttack() {
        // Filter available attacks that are off cooldown
        const availableAttacks = this.availableAttacks.filter(name => {
            const attack = this.attacks[name];
            return !attack.currentCooldown || attack.currentCooldown <= 0;
        });

        if (availableAttacks.length === 0) return;

        // Choose random attack
        const attackName = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
        this.executeAttack(attackName);
    }

    executeAttack(attackName) {
        const attack = this.attacks[attackName];
        if (!attack) return;

        this.isAttacking = true;
        this.currentAttack = attack;
        this.currentAnimation = attack.animation;
        this.animationFrame = 0;
        this.attackCooldown = attack.cooldown;

        // Schedule attack completion
        const animationDuration = this.animations[attack.animation].frames * this.animations[attack.animation].speed;
        setTimeout(() => this.completeAttack(), animationDuration * 1000);
    }

    completeAttack() {
        if (!this.currentAttack) return;

        // Calculate attack area
        let hitTargets = [];
        switch (this.currentAttack.name) {
            case 'Melee Slash':
            case 'Heavy Smash':
                hitTargets = this.getTargetsInArc(
                    this.currentAttack.range,
                    Math.PI / 3 // 60 degrees
                );
                break;
            case 'Dash Attack':
                hitTargets = this.getTargetsInLine(
                    this.currentAttack.range
                );
                break;
            case 'AoE Blast':
                hitTargets = this.getTargetsInCircle(
                    this.currentAttack.range
                );
                break;
            case 'Projectile':
                hitTargets = this.getTargetsInLine(
                    this.currentAttack.range,
                    0.5 // Narrow width
                );
                break;
            case 'Spin Attack':
                hitTargets = this.getTargetsInCircle(
                    this.currentAttack.range
                );
                break;
            default:
                hitTargets = this.getTargetsInArc(
                    this.currentAttack.range,
                    Math.PI / 2
                );
        }

        // Apply damage
        for (const target of hitTargets) {
            this.dealDamage(target);
        }

        // Reset attack state
        this.isAttacking = false;
        this.currentAttack = null;
        this.currentAnimation = 'idle';
    }

    getTargetsInArc(range, angle) {
        const player = (this.gameEngine && this.gameEngine.player) || (this.section && this.section.gameEngine && this.section.gameEngine.player) || (window.game && window.game.player);
        if (!player) return [];
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > range) return [];
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(this.normalizeAngle(targetAngle - this.direction));
        return angleDiff <= angle / 2 ? [player] : [];
    }

    getTargetsInLine(range, width = 1) {
        const player = (this.gameEngine && this.gameEngine.player) || (this.section && this.section.gameEngine && this.section.gameEngine.player) || (window.game && window.game.player);
        if (!player) return [];
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > range) return [];
        const perpDistance = Math.abs(
            dx * Math.sin(this.direction) -
            dy * Math.cos(this.direction)
        );
        return perpDistance <= width ? [player] : [];
    }

    getTargetsInCircle(range) {
        const player = (this.gameEngine && this.gameEngine.player) || (this.section && this.section.gameEngine && this.section.gameEngine.player) || (window.game && window.game.player);
        if (!player) return [];
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= range ? [player] : [];
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    dealDamage(target) {
        const damage = this.currentAttack.damage;
        target.takeDamage(damage, this);
    }

    takeDamage(amount, source) {
        // Apply defense
        const damage = Math.max(1, amount - this.defense);
        this.hp -= damage;

        // Check death
        if (this.hp <= 0) {
            this.die();
        }

        return damage;
    }

    die() {
        this.currentAnimation = 'death';
        this.animationFrame = 0;
        
        // Remove from section after death animation
        const animationDuration = this.animations.death.frames * this.animations.death.speed;
        setTimeout(() => {
            this.section.removeBoss(this);
        }, animationDuration * 1000);

        // Drop loot
        this.dropLoot();
    }

    dropLoot() {
        const loot = this.generateLoot();
        for (const item of loot) {
            this.section.addItem(item, this.x, this.y);
        }
    }

    generateLoot() {
        // Generate loot based on boss type
        const lootCount = this.type === 'mini' ? 2 : 5;
        const loot = [];

        for (let i = 0; i < lootCount; i++) {
            const item = this.section.worldGenerator.generateItem(
                0.5 + Math.random() * 0.5 // Quality between 0.5 and 1.0
            );
            loot.push(item);
        }

        return loot;
    }

    checkCollision(x, y) {
        // Get nearby chunks
        const chunks = this.section.getChunksInRect(
            x - this.size.width / 2,
            y - this.size.height / 2,
            this.size.width,
            this.size.height
        );

        // Check collision with walls and obstacles
        for (const chunk of chunks) {
            if (chunk.hasCollisionAt(x, y)) {
                return true;
            }
        }

        return false;
    }

    render(ctx, camera) {
        // Prefer camera parameter; fall back to references on gameEngine/section/global
        const cam = camera || (this.gameEngine && this.gameEngine.camera) || (this.section && this.section.gameEngine && this.section.gameEngine.camera) || (window.game && window.game.camera);
        if (!cam) return; // nothing to draw against

        // Calculate screen position
        const screenPos = cam.worldToScreen(this.x, this.y);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenPos.x,
            screenPos.y + this.size.height * 16,
            this.size.width * 16,
            this.size.height * 8,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Draw boss sprite
        const sprite = this.getSprite();
        if (sprite) {
            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(this.direction);
            ctx.drawImage(
                sprite,
                -this.size.width * 16,
                -this.size.height * 16,
                this.size.width * 32,
                this.size.height * 32
            );
            ctx.restore();
        } else {
            // Fallback colored rectangle
            ctx.fillStyle = this.colors.skin;
            ctx.fillRect(
                screenPos.x - this.size.width * 16,
                screenPos.y - this.size.height * 16,
                this.size.width * 32,
                this.size.height * 32
            );
        }

        // Draw health bar
        this.renderHealthBar(ctx, screenPos);
    }

    renderHealthBar(ctx, screenPos) {
        const width = this.size.width * 32;
        const height = 6;
        const x = screenPos.x - width / 2;
        const y = screenPos.y - this.size.height * 16 - 20;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

        // Health bar
        const healthPercent = this.hp / this.maxHp;
        ctx.fillStyle = this.getHealthColor(healthPercent);
        ctx.fillRect(x, y, width * healthPercent, height);
    }

    getHealthColor(percent) {
        if (percent > 0.6) return '#2ecc71';
        if (percent > 0.3) return '#f1c40f';
        return '#e74c3c';
    }

    getSprite() {
        return this.sprites[this.currentAnimation]?.[this.animationFrame];
    }
}