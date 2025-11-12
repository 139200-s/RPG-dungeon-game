/* movement.js */
(function() {
    window.Movement = window.Movement || {};

    window.Movement.updatePlayerMovement = function(player, deltaTime) {
    const tileSize = 32;

    if (!player.isMoving) {  // Alleen input accepteren als niet aan het bewegen
        const input = player.gameEngine.input.getMovementVector();

        if (input.dx !== 0 && input.dy !== 0) input.dy = 0; // Geen diagonalen

        if (input.dx !== 0 || input.dy !== 0) {
            let currentTileX = Math.round(player.x / tileSize);
            let currentTileY = Math.round(player.y / tileSize);
            let targetTileX = currentTileX + input.dx;
            let targetTileY = currentTileY + input.dy;

            let newX = targetTileX * tileSize;
            let newY = targetTileY * tileSize;

            if (!window.Movement.checkCollision(player, newX, newY)) {
                player.targetX = newX;
                player.targetY = newY;
                player.isMoving = true;
                player.direction = Math.atan2(input.dy, input.dx);
                player.currentAnimation = 'walk';
            }
        } else {
            player.currentAnimation = 'idle';
        }
    } else {
        // Beweeg richting targetX/Y zonder input toe te laten
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
            player.isMoving = false;  // Vrij voor nieuwe input
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

