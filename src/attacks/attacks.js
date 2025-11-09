/* Attack utilities extracted from Player to centralize attack & damage calculation logic.
   Exposes a global `Attacks` object so existing code can call Attacks.playerAttack(player) etc.
*/
(function() {
    window.Attacks = window.Attacks || {};

    window.Attacks.calculateDamage = function(attacker, weapon) {
        try {
            let damage = (weapon && weapon.damage) ? weapon.damage : 0;
            damage += (typeof attacker.getStrength === 'function') ? attacker.getStrength() : (attacker.baseStrength || 0);

            // Apply critical hit
            const critChance = (typeof attacker.getCriticalChance === 'function') ? attacker.getCriticalChance() : 0.05;
            if (Math.random() < critChance) {
                damage *= 1.5;
            }

            // Apply buffs
            if (attacker.buffs && attacker.buffs.values) {
                for (const buff of attacker.buffs.values()) {
                    if (buff.type === 'damage') {
                        damage *= buff.multiplier;
                    }
                }
            }

            return Math.floor(damage);
        } catch (e) {
            console.error('Attacks.calculateDamage error:', e);
            return 0;
        }
    };

    window.Attacks.dealDamage = function(attacker, target, weapon) {
        try {
            const damage = window.Attacks.calculateDamage(attacker, weapon);
            if (target && typeof target.takeDamage === 'function') {
                target.takeDamage(damage, attacker);
            }
        } catch (e) {
            console.error('Attacks.dealDamage error:', e);
        }
    };

    window.Attacks.playerAttack = function(player) {
        try {
            if (player.isAttacking) return;

            player.isAttacking = true;
            player.currentAnimation = 'attack';
            player.animationFrame = 0;
            player.attackCooldown = 0.5; // 500ms cooldown

            // Get equipped weapon
            const weapon = (player.inventory && typeof player.inventory.getEquippedWeapons === 'function') ? player.inventory.getEquippedWeapons()[0] : (player.inventory && player.inventory.equipment ? player.inventory.equipment.weaponSlot1 : null);
            if (!weapon) {
                // Reset attack state after a short delay even if no weapon is equipped
                setTimeout(() => {
                    player.isAttacking = false;
                    if (!player.gameEngine.input.getMovementVector().isMoving) player.currentAnimation = 'idle';
                }, 300);
                return;
            }

            // Calculate attack area
            const attackRange = weapon.range || 1;
            const attackAngle = Math.PI / 3; // 60 degrees

            // Query engine for targets in arc
            const hits = player.gameEngine.getEntitiesInArc(
                player.x, player.y, attackRange,
                player.direction - attackAngle / 2,
                player.direction + attackAngle / 2
            );

            for (const target of hits) {
                window.Attacks.dealDamage(player, target, weapon);
            }

            // Reset attack state after animation
            setTimeout(() => {
                player.isAttacking = false;
                if (!player.gameEngine.input.getMovementVector().isMoving) {
                    player.currentAnimation = 'idle';
                }
            }, 500);
        } catch (e) {
            console.error('Attacks.playerAttack error:', e);
            // Ensure attack flag cleared to avoid lockout
            player.isAttacking = false;
        }
    };

})();
// mark as real implementation so shims can detect it
try { window.Attacks.__isReal = true; } catch (e) { /* ignore */ }
