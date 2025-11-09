/* Attack utilities extracted from Player to centralize attack & damage calculation logic.
   Exposes a global `Attacks` object so existing code can call Attacks.playerAttack(player) etc.
*/
// shim: forward Attacks to implementation in src/attacks/attacks.js
(function() {
    if (window.Attacks) return; // already defined by the new module

    window.Attacks = window.Attacks || {};

    window.Attacks.calculateDamage = function(attacker, weapon) {
        try {
            if (window.Attacks && window.Attacks.__isReal) return window.Attacks.calculateDamage(attacker, weapon);
        } catch (e) { /* ignore */ }
        return 0;
    };

    window.Attacks.dealDamage = function(attacker, target, weapon) {
        try {
            if (window.Attacks && window.Attacks.__isReal) return window.Attacks.dealDamage(attacker, target, weapon);
        } catch (e) { /* ignore */ }
    };

    window.Attacks.playerAttack = function(player) {
        try {
            if (window.Attacks && window.Attacks.__isReal) return window.Attacks.playerAttack(player);
        } catch (e) { /* ignore */ }
    };

})();
