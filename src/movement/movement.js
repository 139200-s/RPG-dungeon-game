/* movement.js */
(function() {
    window.Movement = window.Movement || {};

    window.Movement.updatePlayerMovement = function(player, deltaTime) {
        try {
            const input = player.gameEngine.input.getMovementVector();

            // Verbied diagonaal lopen: als beide richtingen worden ingedrukt, geef prioriteit aan horizontaal
            if (input.dx !== 0 && input.dy !== 0) {
                input.dy = 0;
            }

            if (input.dx !== 0 || input.dy !== 0) {
                player.direction = Math.atan2(input.dy, input.dx);

                // Bereken nieuwe positie
                let nextX = player.x + input.dx * player.speed * deltaTime;
                let nextY = player.y + input.dy * player.speed * deltaTime;

                // Zorg dat coördinaten altijd gehele getallen zijn
                nextX = Math.round(nextX);
                nextY = Math.round(nextY);

                // Controleer botsingen per as
                if (!window.Movement.checkCollision(player, nextX, player.y)) {
                    player.x = nextX;
                }
                if (!window.Movement.checkCollision(player, player.x, nextY)) {
                    player.y = nextY;
                }

                // Rond af zodat X en Y nooit decimalen hebben
                player.x = Math.round(player.x);
                player.y = Math.round(player.y);

                player.currentAnimation = 'walk';
            } else {
                player.currentAnimation = 'idle';
            }
        } catch (e) {
            console.error('Movement.updatePlayerMovement error:', e);
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
