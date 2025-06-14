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

function castRay(ox, oy, oz, dx, dy, dz) {
    let nTriangles = worldVertices.length / 9;
    let tMin = Infinity;
    let triangleIdxMin = -1;
    for (let triangleIdx = 0; triangleIdx < nTriangles; triangleIdx++) {
        let triangleOffset = triangleIdx * 9;
        let v0x = worldVertices[triangleOffset], v0y = worldVertices[triangleOffset + 1], v0z = worldVertices[triangleOffset + 2];
        let v1x = worldVertices[triangleOffset + 3], v1y = worldVertices[triangleOffset + 4], v1z = worldVertices[triangleOffset + 5];
        let v2x = worldVertices[triangleOffset + 6], v2y = worldVertices[triangleOffset + 7], v2z = worldVertices[triangleOffset + 8];
        let t = rayTriangleIntersect(
            ox, oy, oz,
            dx, dy, dz,
            v0x, v0y, v0z,
            v1x, v1y, v1z,
            v2x, v2y, v2z
        );
        if (t > 0) {
            if (t < tMin) {
                tMin = t;
                triangleIdxMin = triangleIdx;
            }
        }
    }
    return { t: tMin, triangleIdx: triangleIdxMin };
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
    let rcRes = castRay(playerX, playerY, playerZ, rayStepX, rayStepY, rayStepZ);
    let t = rcRes.t;
    let triangleIdx = rcRes.triangleIdx;

    // Determine color
    let r, g, b; // , a;
    if (triangleIdx === -1) {
        r = 128;
        g = 128;
        b = 255;
    } else {
        // Convert world coords to tex coords
        let worldX = rayStepX * t, worldY = rayStepY * t, worldZ = rayStepZ * t;

        // Sample texture
        let triangleOffset = triangleIdx * 9;
        let v0x = worldVertices[triangleOffset], v0y = worldVertices[triangleOffset + 1], v0z = worldVertices[triangleOffset + 2];
        let v1x = worldVertices[triangleOffset + 3], v1y = worldVertices[triangleOffset + 4], v1z = worldVertices[triangleOffset + 5];
        let v2x = worldVertices[triangleOffset + 6], v2y = worldVertices[triangleOffset + 7], v2z = worldVertices[triangleOffset + 8];
        let uv = computeTriangleUV(v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z, worldX, worldY, worldZ);
        let texX = Math.round(uv.u), texY = Math.round(uv.v);

        let texIdx = worldTextureIndices[triangleIdx];
        let tex = worldTextureData[texIdx];
        let texOffset = 4 * (texY * worldTextureSizes[2 * triangleIdx] + texX);
        r = tex[texOffset];
        g = tex[texOffset + 1];
        b = tex[texOffset + 2];
        // a = tex[texOffset + 3];
    }

	// Write to render buffer
    writeRenderBuffer(y * renderBufferW + x, r, g, b, 255 /* a */);
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
