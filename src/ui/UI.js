class UI {
    constructor() {
        this.messages = [];
        this.messageTimeout = 3000; // Messages disappear after 3 seconds
    }

    showMessage(text) {
        this.messages.push({
            text: text,
            timestamp: Date.now()
        });
    }

    update() {
        // Remove old messages
        const now = Date.now();
        this.messages = this.messages.filter(msg => 
            now - msg.timestamp < this.messageTimeout
        );
    }

    render(ctx) {
        // Render HUD first
        if (window.game && window.game.player) {
            HUD.render(ctx, window.game.player);
        }
        


        // Render messages
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        
        this.messages.forEach((msg, i) => {
            const age = (Date.now() - msg.timestamp) / this.messageTimeout;
            const alpha = Math.min(1, 3 * (1 - age));
            ctx.globalAlpha = alpha;
            ctx.fillText(msg.text, 10, 30 + i * 20);
        });
        
        ctx.restore();
    }
}