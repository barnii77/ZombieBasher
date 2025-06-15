'use strict';

// Array for writing rendering results that are then rendered to the canvas (but only after further processing).
// Initialized by the game loop.
let rawRenderBuffer, renderBufferImg, renderBufferW, renderBufferH;

// NOTE: a lot of places in this file should use abstractions like Vec3 types, but those are just not possible in JS without paying
//  for them, with the currency being FPS. I am worried about such abstractions introducing allocations and worsening the
//  JIT compiler's ability to optimize our hot path. Thus, a lot of logic is inlined and unrolled.

function initRenderBuffer(canvas, ctx) {
	renderBufferW = RENDER_BUF_W;
	renderBufferH = RENDER_BUF_H;
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

function getBrightness(v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z) {
    // Compute edges v0v1 and v0v2
    const v0v1x = v1x - v0x;
    const v0v1y = v1y - v0y;
    const v0v1z = v1z - v0z;

    const v0v2x = v2x - v0x;
    const v0v2y = v2y - v0y;
    const v0v2z = v2z - v0z;

    // Compute normal N = v0v1 × v0v2
    const nx = v0v1y * v0v2z - v0v1z * v0v2y;
    const ny = v0v1z * v0v2x - v0v1x * v0v2z;
    const nz = v0v1x * v0v2y - v0v1y * v0v2x;

    // Compute brightness with directional and ambient lighting
    let dot = nx * LIGHT_DIRECTION_X + ny * LIGHT_DIRECTION_Y + nz * LIGHT_DIRECTION_Z;
    let brightness = Math.abs(dot) * (1.0 - AMBIENT_LIGHT) + AMBIENT_LIGHT;

    return brightness;
}

function renderPixel(x, y, rayStepX, rayStepY, rayStepZ) {
	// Cast ray
    let rcRes = castRay(playerX, playerY, playerZ, rayStepX, rayStepY, rayStepZ);
    let t = rcRes.t;
    let triangleIdx = rcRes.triangleIdx;

    // Determine color
    let r, g, b; // , a;
    if (triangleIdx === -1) {
        // Draw a sky-blue background color
        r = 128;
        g = 128;
        b = 255;
    } else {
        // Convert world coords to tex coords
        let worldX = rayStepX * t + playerX, worldY = rayStepY * t + playerY, worldZ = rayStepZ * t + playerZ;

        // Sample texture
        let triangleOffset = triangleIdx * 9;
        let v0x = worldVertices[triangleOffset], v0y = worldVertices[triangleOffset + 1], v0z = worldVertices[triangleOffset + 2];
        let v1x = worldVertices[triangleOffset + 3], v1y = worldVertices[triangleOffset + 4], v1z = worldVertices[triangleOffset + 5];
        let v2x = worldVertices[triangleOffset + 6], v2y = worldVertices[triangleOffset + 7], v2z = worldVertices[triangleOffset + 8];
        let uv = computeTriangleUV(v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z, worldX, worldY, worldZ);

        if (uv === null) return; // degenerate triangle

        let texX = uv.u, texY = uv.v;

        // UV inversion allows you to define quads intuitively (one triangle has inverted uv)
        if (worldInvertUVForTriangle[triangleIdx]) {
            texX = 1.0 - texX;
            texY = 1.0 - texY;
        }

        let texIdx = worldTextureIndices[triangleIdx];
        let tex = worldTextureData[texIdx];

        let texW = worldTextureSizes[2 * texIdx];
        let texH = worldTextureSizes[2 * texIdx + 1];
        let texXIdx = Math.round(texW * texX) % texW;
        let texYIdx = Math.round(texH * texY) % texH;
        let texOffset = 4 * (texW * texYIdx + texXIdx);

        let brightness = 1.0; // getBrightness(v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z);
        // TODO this is a patch for an underlying bug, not a fix
        if (tex === undefined) {
            return;
        }
        r = tex[texOffset] * brightness;
        g = tex[texOffset + 1] * brightness;
        b = tex[texOffset + 2] * brightness;
        // TODO support alpha by setting new starting point for raycast behind previous hit point if alpha is transparent and interpolating the results)
        //  and doing that until you hit either nothing (sky) or something with alpha 255
        // a = tex[texOffset + 3];
    }

	// Write to render buffer
    writeRenderBuffer(y * renderBufferW + x, r, g, b, 255 /* a */);
}

function render() {
    let rotationMat = buildRotationMatrix3x3(playerAngleHorizontal, playerAngleVertical);
    for (let y = 0; y < renderBufferH; y++) {
        for (let x = 0; x < renderBufferW; x++) {
            // Compute normalized ray direction
            let xRel = x / renderBufferH * 2 - renderBufferW / renderBufferH;
            let yRel = y / renderBufferH * 2 - 1;
            let rayStepX = xRel;
            let rayStepY = -yRel; // invert y so negative values are down not up
            let rayStepZ = 1;
            let mag = magnitude(rayStepX, rayStepY, rayStepZ);
            rayStepX /= mag;
            rayStepY /= mag;
            rayStepZ /= mag;
            let rayDir = mat3MultiplyVec3(rotationMat, rayStepX, rayStepY, rayStepZ);
            rayStepX = rayDir.x;
            rayStepY = rayDir.y;
            rayStepZ = rayDir.z;
            renderPixel(x, y, rayStepX, rayStepY, rayStepZ);
        }
    }
}

function draw(canvas, ctx, visibleCanvas, visibleCtx) {
    ctx.putImageData(renderBufferImg, 0, 0);
    visibleCtx.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
    visibleCtx.drawImage(canvas, 0, 0, visibleCanvas.width, visibleCanvas.height);
}
