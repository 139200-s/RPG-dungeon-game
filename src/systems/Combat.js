class Combat {
    constructor(player, opponent) {
        this.player = player;
        this.opponent = opponent;
        this.turn = 'player';
        this.round = 1;
        this.log = [];
        this.state = 'active';
        this.effects = new Map();
        
        // Combat options
        this.actions = {
            attack: {
                name: 'Attack',
                execute: (attacker, target) => this.executeAttack(attacker, target)
            },
            ability: {
                name: 'Ability',
                execute: (attacker, target, abilityIndex) => 
                    this.executeAbility(attacker, target, abilityIndex)
            },
            potion: {
                name: 'Potion',
                execute: (user, target, potionIndex) => 
                    this.usePotion(user, potionIndex)
            },
            item: {
                name: 'Item',
                execute: (user, target, itemIndex) => 
                    this.useItem(user, itemIndex)
            },
            sidekick: {
                name: 'Sidekick',
                execute: (user, target, sidekickIndex) => 
                    this.useSidekick(user, sidekickIndex)
            }
        };
    }

    start() {
        // Initialize combat
        this.log.push('Combat started!');
        this.applyStartOfCombatEffects();
        return this.getCurrentTurnOptions();
    }

    executeAction(action, params = {}) {
        if (this.state !== 'active') return;

        const currentActor = this.turn === 'player' ? this.player : this.opponent;
        const target = this.turn === 'player' ? this.opponent : this.player;

        // Execute the chosen action
        const result = this.actions[action].execute(currentActor, target, params);
        this.log.push(result.message);

        // Apply any effects
        if (result.effects) {
            this.applyEffects(result.effects);
        }

        // Check for combat end
        if (this.checkCombatEnd()) {
            return this.endCombat();
        }

        // Switch turns
        this.switchTurn();
        return this.getCurrentTurnOptions();
    }

    executeAttack(attacker, target) {
        const weapon = attacker.getEquippedWeapon();
        let damage = this.calculateDamage(attacker, target, weapon);
        
        // Apply damage modifiers from effects
        damage = this.applyDamageModifiers(damage, attacker, target);
        
        // Apply defense
        const defense = target.getDefense();
        const finalDamage = Math.max(1, damage - defense);
        
        // Apply damage
        target.takeDamage(finalDamage);
        
        return {
            message: `${attacker.name} deals ${finalDamage} damage to ${target.name}!`,
            effects: weapon.effects
        };
    }

    executeAbility(attacker, target, abilityIndex) {
        const ability = attacker.getAbility(abilityIndex);
        
        if (!ability || ability.cooldown > 0) {
            return {
                message: 'Ability not ready!',
                success: false
            };
        }

        const result = ability.execute(attacker, target);
        ability.startCooldown();

        return result;
    }

    usePotion(user, potionIndex) {
        const potion = user.getPotion(potionIndex);
        
        if (!potion) {
            return {
                message: 'No potion available!',
                success: false
            };
        }

        const result = potion.use(user);
        user.removePotion(potionIndex);

        return result;
    }

    useItem(user, itemIndex) {
        const item = user.getItem(itemIndex);
        
        if (!item || !item.useable) {
            return {
                message: 'Item cannot be used!',
                success: false
            };
        }

        const result = item.use(user);
        if (item.consumable) {
            user.removeItem(itemIndex);
        }

        return result;
    }

    useSidekick(user, sidekickIndex) {
        const sidekick = user.getSidekick(sidekickIndex);
        
        if (!sidekick || sidekick.cooldown > 0) {
            return {
                message: 'Sidekick not ready!',
                success: false
            };
        }

        const result = sidekick.execute(user, this.turn === 'player' ? this.opponent : this.player);
        sidekick.startCooldown();

        return result;
    }

    calculateDamage(attacker, target, weapon) {
        const base = weapon.damage;
        const strength = attacker.getStrength();
        const critical = this.rollCritical(attacker);
        
        let damage = base + strength;
        if (critical) {
            damage *= 1.5;
        }
        
        return Math.floor(damage);
    }

    applyDamageModifiers(damage, attacker, target) {
        let modified = damage;

        // Apply attacker's offensive effects
        this.effects.get(attacker.id)?.forEach(effect => {
            if (effect.type === 'damage_mod') {
                modified *= effect.value;
            }
        });

        // Apply target's defensive effects
        this.effects.get(target.id)?.forEach(effect => {
            if (effect.type === 'damage_reduction') {
                modified *= (1 - effect.value);
            }
        });

        return Math.floor(modified);
    }

    rollCritical(attacker) {
        const baseCritChance = attacker.getCriticalChance();
        return Math.random() < baseCritChance;
    }

    applyEffects(effects) {
        effects.forEach(effect => {
            const target = effect.target === 'self' ? 
                this.turn === 'player' ? this.player : this.opponent :
                this.turn === 'player' ? this.opponent : this.player;

            const targetEffects = this.effects.get(target.id) || [];
            targetEffects.push({
                ...effect,
                duration: effect.duration || 1
            });
            this.effects.set(target.id, targetEffects);
        });
    }

    updateEffects() {
        for (const [id, effects] of this.effects.entries()) {
            // Update duration and remove expired effects
            const remaining = effects.filter(effect => {
                effect.duration--;
                return effect.duration > 0;
            });

            if (remaining.length > 0) {
                this.effects.set(id, remaining);
            } else {
                this.effects.delete(id);
            }
        }
    }

    switchTurn() {
        this.updateEffects();
        
        if (this.turn === 'player') {
            this.turn = 'opponent';
            // If opponent's turn, execute AI
            setTimeout(() => this.executeAITurn(), 1000);
        } else {
            this.turn = 'player';
            this.round++;
        }
    }

    executeAITurn() {
        // Simple AI for opponent's turn
        const options = this.getCurrentTurnOptions();
        const choice = this.selectAIAction(options);
        this.executeAction(choice.action, choice.params);
    }

    selectAIAction(options) {
        // Simple AI decision making
        if (this.opponent.hp < this.opponent.maxHp * 0.3) {
            // Try to use healing potion if low on health
            const healingPotion = this.opponent.getPotions()
                .findIndex(p => p.type === 'healing');
            
            if (healingPotion !== -1) {
                return {
                    action: 'potion',
                    params: { potionIndex: healingPotion }
                };
            }
        }

        // Use ability if available and beneficial
        const ability = this.opponent.getAbilities()
            .findIndex(a => a.cooldown === 0 && a.isbeneficial());
        
        if (ability !== -1) {
            return {
                action: 'ability',
                params: { abilityIndex: ability }
            };
        }

        // Default to basic attack
        return {
            action: 'attack',
            params: {}
        };
    }

    getCurrentTurnOptions() {
        const actor = this.turn === 'player' ? this.player : this.opponent;
        
        return {
            turn: this.turn,
            round: this.round,
            options: Object.keys(this.actions).filter(action => {
                switch (action) {
                    case 'ability':
                        return actor.hasUsableAbility();
                    case 'potion':
                        return actor.hasPotions();
                    case 'item':
                        return actor.hasUsableItems();
                    case 'sidekick':
                        return actor.hasUsableSidekick();
                    default:
                        return true;
                }
            })
        };
    }

    checkCombatEnd() {
        return this.player.hp <= 0 || this.opponent.hp <= 0;
    }

    endCombat() {
        this.state = 'ended';
        const winner = this.player.hp > 0 ? this.player : this.opponent;
        
        return {
            ended: true,
            winner: winner.id,
            rewards: this.calculateRewards()
        };
    }

    calculateRewards() {
        if (this.player.hp <= 0) return null;

        // Generate rewards based on opponent type and combat performance
        const rewards = {
            exp: this.calculateExpReward(),
            items: this.generateLootReward(),
            gold: this.calculateGoldReward()
        };

        return rewards;
    }

    calculateExpReward() {
        const baseExp = this.opponent.level * 10;
        const roundBonus = Math.max(0, 10 - this.round) * 5;
        return baseExp + roundBonus;
    }

    generateLootReward() {
        // Generate loot based on opponent type and random chance
        return this.opponent.generateLoot();
    }

    calculateGoldReward() {
        return Math.floor(this.opponent.level * 5 * (1 + Math.random()));
    }
}