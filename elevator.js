'use strict';

class Elevator {
    vertexOffset = 0;
    y = 0.0;
    height = 0.0;
    speed = 0.0;

    constructor(vertexOffset, y, height, speed) {
        this.vertexOffset = vertexOffset;
        this.y = y;
        this.height = height;
        this.speed = speed;
    }

    moveQuad() {
        let t = window.performance.now() / 1000.0;
        let h = Math.sin(t);
        for (let i = 0; i < 3; i++) {
            worldVertices[this.vertexOffset + 3 * i + 1] = this.y + this.height * Math.sin(t * this.speed);
        }
    }

    getBodyTriangles() {
        return [Math.floor(this.vertexOffset / 9), Math.floor(this.vertexOffset / 9) + 1];
    }

    die() {
        // Cannot die, elevators are too powerful for that
    }

    step(dt) {
        this.moveQuad();
    }
}
