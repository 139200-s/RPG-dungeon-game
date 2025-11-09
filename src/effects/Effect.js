class Effect {
    constructor(x, y, duration = 1000) {
        this.x = x;
        this.y = y;
        this.startTime = Date.now();
        this.duration = duration;
        this.isDone = false;
    }

    update(deltaTime) {
        if (Date.now() - this.startTime >= this.duration) {
            this.isDone = true;
        }
    }

    render(ctx, pos) {
        // Override in child classes
    }
}