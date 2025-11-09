class CombatUI {
    static render(ctx, combat) {
        // Minimal placeholder combat UI to avoid 404/runtime errors
        const w = 260, h = 80;
        const x = ctx.canvas.width - w - 20;
        const y = ctx.canvas.height - h - 20;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Combat UI (placeholder)', x + w/2, y + 30);
        ctx.restore();
    }
}
