class PauseMenu {
    static render(ctx) {
        const w = 360;
        const h = 100;
        const x = Math.round((ctx.canvas.width - w) / 2);
        const y = 20; // top of screen

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, y, w, h);

        // Border
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Pause Menu', x + w / 2, y + 28);

        // Options
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('- Debug', x + 20, y + 56);
        ctx.fillText('- More features coming soon', x + 20, y + 78);
    }
}

// Ensure PauseMenu is globally available
window.PauseMenu = PauseMenu;
