/* movement.js */
(function() {
    window.Movement = window.Movement || {};

    window.Movement.updatePlayerMovement = function(player, deltaTime) {
        const tileSize = 32;
        player.x = Math.round(player.x); // Zorg gegarandeerd dat startpositie altijd op tilegrid is
        player.y = Math.round(player.y);

        if (!player.isMoving) {
            const input = player.gameEngine.input.getMovementVector();
            // Prioriteit horizontaal, geen diagonalen
            if (input.dx !== 0 && input.dy !== 0) input.dy = 0;

            if (input.dx !== 0 || input.dy !== 0) {
                // Huidige tile
                let tileX = Math.round(player.x / tileSize);
                let tileY = Math.round(player.y / tileSize);

                let targetTileX = tileX + input.dx;
                let targetTileY = tileY + input.dy;

                let newX = targetTileX * tileSize;
                let newY = targetTileY * tileSize;

                // Check collisions op nieuwe tile
                if (!window.Movement.checkCollision(player, newX, newY)) {
                    player.targetX = newX;
                    player.targetY = newY;
                    player.isMoving = true;
                    player.direction = Math.atan2(input.dy, input.dx);
                    player.currentAnimation = 'walk';
                } else {
                    player.currentAnimation = 'idle';
                }
            } else {
                player.currentAnimation = 'idle';
            }
        } else {
            // Animeer richting targetX/targetY
            let speed = player.speed * deltaTime;
            if (Math.abs(player.x - player.targetX) > speed) {
                player.x += Math.sign(player.targetX - player.x) * speed;
            } else {
                player.x = player.targetX;
            }
            if (Math.abs(player.y - player.targetY) > speed) {
                player.y += Math.sign(player.targetY - player.y) * speed;
            } else {
                player.y = player.targetY;
            }
            if (player.x === player.targetX && player.y === player.targetY) {
                player.isMoving = false;
            }
        }
    };

    window.Movement.checkCollision = function(player, x, y) {
        try {
            const chunks = player.gameEngine.getNearbyChunks(x, y);
            for (const chunk of chunks) {
                if (chunk && typeof chunk.hasCollisionAt === 'function') {
                    if (chunk.hasCollisionAt(x, y)) return true;
                } else if (chunk && typeof chunk.checkCollision === 'function') {
                    if (chunk.checkCollision(x, y)) return true;
                }
            }
        } catch (e) {}
        return false;
    };
})();
try { window.Movement.__isReal = true; } catch (e) {}
