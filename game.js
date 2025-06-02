'use strict';

function initGame(canvas, ctx) {
    stepCounter = 0;
    initRenderBuffer(canvas, ctx);
}

function step() {
    // TODO
    stepCounter++;
}

function isGameOver() {
    // TODO
    return stepCounter === 100;

}
