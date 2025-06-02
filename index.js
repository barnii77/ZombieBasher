'use strict';

// The canvas
let canvas;
// The drawing context
let ctx;

function resizeCanvasToAspect() {
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
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    resizeCanvasToAspect();
}

function addUiHandlers() {
    let restart = document.getElementById("restart");
    restart.addEventListener("click", function () {
        initGame(canvas);
    })
    window.addEventListener('resize', () => {
        resizeCanvasToAspect();
        initRenderBuffer(canvas)
    });
}

function gameLoop() {
	let prevTime = window.performance.now();
	let dtAccum = 0;
	let iterCounter = 0;
    while (!isGameOver()) {
		let t = window.performance.now();
        render();
        draw(ctx);
		let dt = t - prevTime;
        step(dt);
		
		dtAccum += dt;
		iterCounter++;
		if (dtAccum > 1) {
			console.log(`${iterCounter/dtAccum} FPS`);
			dtAccum = 0, iterCounter = 0;
		}
		
		prevTime = t;
    }
}

function main() {
    initCanvas();
    addUiHandlers();
    initGame(canvas, ctx);
    gameLoop();
}

main()
