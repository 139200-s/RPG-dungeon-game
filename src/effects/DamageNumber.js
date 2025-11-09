class DamageNumber extends Effect {
    constructor(x, y, amount) {
        super(x, y, 1000); // 1 second duration
        this.amount = amount;
        this.color = '#f00';
        this.fontSize = Math.min(20 + amount / 5, 40);
    }

    render(ctx, pos) {
        const progress = (Date.now() - this.startTime) / this.duration;
        const alpha = 1 - progress;
        const offsetY = -progress * 50; // Float upward

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(this.amount.toString(), pos.x, pos.y + offsetY);
        ctx.fillText(this.amount.toString(), pos.x, pos.y + offsetY);
        ctx.restore();
    }
}