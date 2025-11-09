/* Movement utilities extracted from Player to centralize movement logic.
   Exposes a global `Movement` object so existing code can call Movement.updatePlayerMovement(player, deltaTime)
*/
(function() {
    window.Movement = window.Movement || {};

    // Update player movement: reads input from player.gameEngine.input and applies collision checks
    window.Movement.updatePlayerMovement = function(player, deltaTime) {
        try {
            const input = player.gameEngine.input.getMovementVector();

            if (input.dx !== 0 || input.dy !== 0) {
                // Update direction
                player.direction = Math.atan2(input.dy, input.dx);

                // Calculate movement with collision detection
                const nextX = player.x + input.dx * player.speed * deltaTime;
                const nextY = player.y + input.dy * player.speed * deltaTime;

                // Check collision for X and Y separately to allow sliding
                if (!window.Movement.checkCollision(player, nextX, player.y)) {
                    player.x = nextX;
                }
                if (!window.Movement.checkCollision(player, player.x, nextY)) {
                    player.y = nextY;
                }

                player.currentAnimation = 'walk';
            } else {
                player.currentAnimation = 'idle';
            }
        } catch (e) {
            // If anything goes wrong, fail safe and don't move the player
            console.error('Movement.updatePlayerMovement error:', e);
        }
    };

    // Check collision at world pixel coordinate (x, y) for given player
    window.Movement.checkCollision = function(player, x, y) {
        try {
            const chunks = player.gameEngine.getNearbyChunks(x, y);
            for (const chunk of chunks) {
                if (chunk && typeof chunk.hasCollisionAt === 'function') {
                    if (chunk.hasCollisionAt(x, y)) return true;
                } else if (chunk && typeof chunk.hasCollisionAt === 'undefined') {
                    // Best-effort: check chunk.checkCollision if present
                    try {
                        if (typeof chunk.checkCollision === 'function' && chunk.checkCollision(x, y)) return true;
                    } catch (e) { /* ignore */ }
                }
            }
        } catch (e) {
            // swallow errors to avoid breaking movement
        }
        return false;
    };

})();
// mark as real implementation so shims can detect it
try { window.Movement.__isReal = true; } catch (e) { /* ignore */ }
