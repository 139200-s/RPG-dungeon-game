class Enemy extends Entity {
    constructor(x, y, type = 'basic') {
        super(x, y);
        
        // Set enemy type and stats
        this.type = type;
        switch(type) {
            case 'fast':
                this.maxHealth = 50;
                this.health = this.maxHealth;
                this.speed = 4;
                this.damage = 10;
                this.defense = 2;
                this.experienceValue = 15;
                break;
            case 'tank':
                this.maxHealth = 200;
                this.health = this.maxHealth;
                this.speed = 1;
                this.damage = 15;
                this.defense = 5;
                this.experienceValue = 25;
                break;
            case 'ranged':
                this.maxHealth = 75;
                this.health = this.maxHealth;
                this.speed = 2;
                this.damage = 20;
                this.defense = 1;
                this.experienceValue = 20;
                this.attackRange = 200;
                break;
            default: // basic
                this.maxHealth = 100;
                this.health = this.maxHealth;
                this.speed = 2;
                this.damage = 15;
                this.defense = 3;
                this.experienceValue = 10;
        }

        // AI state
        this.state = 'idle';
        this.targetX = x;
        this.targetY = y;
        this.lastAttack = 0;
        this.attackCooldown = 1000; // 1 second
        this.aggroRange = 250;
        this.deaggroRange = 400;
        
        // Pathfinding
        this.path = [];
        this.pathUpdateTime = 0;
        this.pathUpdateDelay = 500; // Update path every 0.5 seconds
    }

    update(deltaTime) {
        super.update(deltaTime);

        const player = window.game.player;
        const distanceToPlayer = Math.sqrt(
            Math.pow(player.x - this.x, 2) +
            Math.pow(player.y - this.y, 2)
        );

        // Update state based on distance to player
        if (this.state === 'idle' && distanceToPlayer <= this.aggroRange) {
            this.state = 'chase';
        } else if (this.state === 'chase' && distanceToPlayer > this.deaggroRange) {
            this.state = 'return';
            this.targetX = this.spawnX;
            this.targetY = this.spawnY;
        }

        // State behavior
        switch(this.state) {
            case 'idle':
                this.updateIdle(deltaTime);
                break;
            case 'chase':
                this.updateChase(deltaTime, player);
                break;
            case 'return':
                this.updateReturn(deltaTime);
                break;
            case 'attack':
                this.updateAttack(deltaTime, player);
                break;
        }
    }

    updateIdle(deltaTime) {
        // Random movement
        if (Math.random() < 0.01) { // 1% chance per frame to move
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            this.targetX = this.x + Math.cos(angle) * distance;
            this.targetY = this.y + Math.sin(angle) * distance;
        }

        this.moveToTarget(deltaTime);
    }

    updateChase(deltaTime, player) {
        // Update path to player
        if (Date.now() - this.pathUpdateTime > this.pathUpdateDelay) {
            this.path = this.findPathTo(player.x, player.y);
            this.pathUpdateTime = Date.now();
        }

        // Follow path
        if (this.path.length > 0) {
            const nextPoint = this.path[0];
            this.targetX = nextPoint.x;
            this.targetY = nextPoint.y;

            if (this.moveToTarget(deltaTime)) {
                this.path.shift();
            }
        }

        // Check if close enough to attack
        const distanceToPlayer = Math.sqrt(
            Math.pow(player.x - this.x, 2) +
            Math.pow(player.y - this.y, 2)
        );

        if (distanceToPlayer <= (this.type === 'ranged' ? this.attackRange : 40)) {
            if (Date.now() - this.lastAttack >= this.attackCooldown) {
                this.state = 'attack';
            }
        }
    }

    updateReturn(deltaTime) {
        this.moveToTarget(deltaTime);

        // Check if back at spawn
        const distanceToSpawn = Math.sqrt(
            Math.pow(this.spawnX - this.x, 2) +
            Math.pow(this.spawnY - this.y, 2)
        );

        if (distanceToSpawn < 10) {
            this.state = 'idle';
            this.health = this.maxHealth; // Heal when returning
        }
    }

    updateAttack(deltaTime, player) {
        if (!player || !player.isAlive() || player.isInvulnerable) {
            this.state = 'chase';
            return;
        }

        if (Date.now() - this.lastAttack >= this.attackCooldown) {
            // Check distance again before attacking
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceToPlayer <= (this.type === 'ranged' ? this.attackRange : 40)) {
                // Perform attack
                if (this.type === 'ranged') {
                    this.shootProjectile(player);
                } else {
                    player.takeDamage(this.damage);
                }
                this.lastAttack = Date.now();
            }
            this.state = 'chase';
        }
    }

    moveToTarget(deltaTime) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) { // Only move if not very close to target
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;

            // Update position if no collision
            if (!window.game.world.checkCollision(this.x + moveX, this.y)) {
                this.x += moveX;
            }
            if (!window.game.world.checkCollision(this.x, this.y + moveY)) {
                this.y += moveY;
            }

            // Update direction
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = dy > 0 ? 'down' : 'up';
            }

            this.isMoving = true;
            return false;
        } else {
            this.isMoving = false;
            return true;
        }
    }

    shootProjectile(target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const projectile = new Projectile(
            this.x,
            this.y,
            Math.cos(angle) * 5,
            Math.sin(angle) * 5,
            this.damage
        );
        window.game.projectiles.add(projectile);
    }

    findPathTo(x, y) {
        // Simple direct path for now
        // Could be replaced with A* pathfinding
        return [{x, y}];
    }

    die() {
        super.die();
        // Drop loot
        if (Math.random() < 0.3) { // 30% chance to drop item
            const item = this.generateLoot();
            window.game.world.items.push(item);
        }
        // Give experience to player
        window.game.player.gainExperience(this.experienceValue);
    }

    generateLoot() {
        // Generate random loot based on enemy type
        const lootTable = {
            basic: [
                {type: 'health', weight: 50},
                {type: 'weapon', weight: 30},
                {type: 'armor', weight: 20}
            ],
            fast: [
                {type: 'health', weight: 40},
                {type: 'weapon', weight: 40},
                {type: 'accessory', weight: 20}
            ],
            tank: [
                {type: 'health', weight: 30},
                {type: 'armor', weight: 50},
                {type: 'accessory', weight: 20}
            ],
            ranged: [
                {type: 'health', weight: 40},
                {type: 'weapon', weight: 40},
                {type: 'scroll', weight: 20}
            ]
        };

        const table = lootTable[this.type];
        const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const item of table) {
            roll -= item.weight;
            if (roll <= 0) {
                return new Item(this.x, this.y, item.type);
            }
        }

        return new Item(this.x, this.y, 'health'); // Fallback
    }
}