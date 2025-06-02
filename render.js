'use strict';

// Constants
let DOWNSCALE_FACTOR = 10;
let FOV_HALF_RAD = Math.PI / 4;

// Array for writing rendering results that are then rendered to the canvas (but only after further processing).
// Initialized by the game loop.
let rawRenderBuffer, renderBufferImg, renderBufferW, renderBufferH;

// NOTE: a lot of places in this file should use abstractions like Vec3 types, but those are just not possible in JS without paying
//  for them, with the currency being FPS. Thus, a lot of logic is inlined and unrolled.

function initRenderBuffer(canvas, ctx) {
	renderBufferW = Math.floor(canvas.width / DOWNSCALE_FACTOR);
	renderBufferH = Math.floor(canvas.height / DOWNSCALE_FACTOR);
	renderBufferImg = ctx.createImageData(renderBufferW, renderBufferH);
    rawRenderBuffer = renderBufferImg.data;
}

function writeRenderBuffer(i, r, g, b, a) {
	let offset = i * 4;
	rawRenderBuffer[offset] = r;
	rawRenderBuffer[offset + 1] = g;
	rawRenderBuffer[offset + 2] = b;
	rawRenderBuffer[offset + 3] = a;
}

function magnitude(x, y, z) {
	return Math.sqrt(x * x + y * y + z * z);
}

function getRayDirection(x, y) {
	let xRel = x / renderBufferW * 2 - 1;
	let yRel = y / renderBufferH * 2 - 1;
	let rayStepX = xRel;
	let rayStepY = yRel;
	let rayStepZ = 1;
	let mag = magnitude(rayStepX, rayStepY, rayStepZ);
	rayStepX /= mag;
	rayStepY /= mag;
	rayStepZ /= mag;
}

function renderPixel(x, y) {
	// Compute normalized ray direction
	let xRel = x / renderBufferW * 2 - 1;
	let yRel = y / renderBufferH * 2 - 1;
	let rayStepX = xRel;
	let rayStepY = yRel;
	let rayStepZ = 1;
	let mag = magnitude(rayStepX, rayStepY, rayStepZ);
	rayStepX /= mag;
	rayStepY /= mag;
	rayStepZ /= mag;

	// Cast ray
	// TODO
	// Sample texture
	// TODO
	// Write to render buffer
    writeRenderBuffer(y * renderBufferW + x, 5, 5, 5, 255);
}

function render() {
    for (let y = 0; y < renderBufferH; y++) {
        for (let x = 0; x < renderBufferW; x++) {
            renderPixel(x, y);
        }
    }
}

function draw(ctx) {
    ctx.putImageData(renderBufferImg, 0, 0);
}