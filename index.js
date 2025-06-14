'use strict';

// The visible canvas (upscales the render buffer)
let visibleCanvas;
// The visible canvas drawing context
let visibleCtx;
// The hidden canvas containing raw render buffer
let canvas;
// The drawing context
let ctx;

function resizeCanvasToAspect(canvas) {
    const vh = window.innerHeight;

    // 20% of viewport height for control panel, 5% for spacer
    const controlPanelHt = 0.20 * vh;
    const spacerHt = 0.05 * vh;
    const canvasHt = vh - controlPanelHt - spacerHt;
    const canvasWd = canvasHt * (16 / 9);

    // Set CSS size for layout and centering
    const viewportWidth = window.innerWidth;
    const leftPadding = (viewportWidth - canvasWd) / 2;
    canvas.style.paddingLeft = leftPadding + 'px';
    canvas.style.width = canvasWd + 'px';
    canvas.style.height = canvasHt + 'px';
}

function initCanvas() {
    visibleCanvas = document.getElementById("canvas");
    visibleCtx = visibleCanvas.getContext("2d");
    let canvasAndContext = newInvisibleCanvas(RENDER_BUF_W, RENDER_BUF_H);
    canvas = canvasAndContext.canvas;
    ctx = canvasAndContext.ctx;
    resizeCanvasToAspect(visibleCanvas);
    setupPointerLock(visibleCanvas, gameOnMouseMove);
}

function addUiHandlers() {
    let restart = document.getElementById("restart");
    restart.addEventListener("click", () => {
        initGame(canvas, ctx);
    })

    let worldUpload = document.getElementById("uploadWorld");
    worldUpload.addEventListener("change", e => {
        let file = e.target.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = e => {
            let content = e.target.result;
            loadWorld(content);
        };
        reader.readAsText(file);
        // loadWorld();  // load an empty world temporarily
    });

    window.addEventListener('resize', () => {
        resizeCanvasToAspect(visibleCanvas);
        // initRenderBuffer(canvas, ctx)
    });
}

let gameLoopState = {
    prevTime: window.performance.now(),
    dtAccum: 0,
    iterCounter: 0,
};

function gameLoop() {
    let prevTime = gameLoopState.prevTime;
    let dtAccum = gameLoopState.dtAccum;
    let iterCounter = gameLoopState.iterCounter;

    let t = window.performance.now();
    render();
    draw(canvas, ctx, visibleCanvas, visibleCtx);
    let dt = (t - prevTime) / 1000;
    step(dt);

    dtAccum += dt;
    iterCounter++;
    if (dtAccum > 1) {
        console.log(`${iterCounter/dtAccum} FPS`);
        dtAccum = 0, iterCounter = 0;
    }

    prevTime = t;

    gameLoopState.prevTime = prevTime;
    gameLoopState.dtAccum = dtAccum;
    gameLoopState.iterCounter = iterCounter;

    if (!isGameOver()) requestAnimationFrame(gameLoop);
}

function main() {
    initCanvas();
    addUiHandlers();
    initGame(canvas, ctx);
    requestAnimationFrame(gameLoop);
}

main()
