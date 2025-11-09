class InventoryUI {
    static render(ctx, inventory) {
        // Minimal placeholder UI so script loads without error
        const x = 20;
        const y = 80;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, 200, 120);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('Inventory (placeholder)', x + 10, y + 24);
        ctx.restore();
    }
}
