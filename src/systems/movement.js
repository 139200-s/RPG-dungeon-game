/* Movement utilities extracted from Player to centralize movement logic.
   Exposes a global `Movement` object so existing code can call Movement.updatePlayerMovement(player, deltaTime)
*/
// shim: forward Movement to implementation in src/movement/movement.js
(function() {
    if (window.Movement) return; // already defined by the new module

    // Create a thin shim that proxies to the implementation under src/movement if available
    window.Movement = window.Movement || {};

    window.Movement.updatePlayerMovement = function(player, deltaTime) {
        try {
            // If the real implementation loaded under src/movement, it will have replaced window.Movement
            if (window.Movement && window.Movement.__isReal) {
                return window.Movement.updatePlayerMovement(player, deltaTime);
            }
            // Otherwise no-op safely
        } catch (e) { /* ignore */ }
    };

    window.Movement.checkCollision = function(player, x, y) {
        try {
            if (window.Movement && window.Movement.__isReal) return window.Movement.checkCollision(player, x, y);
        } catch (e) { /* ignore */ }
        return false;
    };
})();
