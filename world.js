'use strict';

let worldVertices = [];
let worldTextureData = [];
let worldTextureIndices = [];
let worldTextureSizes = [];

function getParenContent(line) {
    return line.slice(line.indexOf('(') + 1, line.lastIndexOf(')'));
}

function parsePoint(line) {
    let numberStrs = getParenContent(line).split(',');
    let nums = [];
    for (let number of numberStrs) {
        nums.push(parseFloat(number));
    }
    return {x: nums[0], y: nums[1], z: nums[2]};
}


async function loadTextureAsUint8Array(texPath, width, height) {
    // Load image
    const img = new Image();
    img.crossOrigin = "anonymous"; // ensure CORS if needed for pixel reading
    const imageLoaded = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(new Error(`Failed to load image from ${texPath}: ${err?.message || "unknown error"}`));
    });
    img.src = texPath;
    await imageLoaded;

    // Create new canvas
    let canvasAndContext = newInvisibleCanvas(width, height);
    let ctx = canvasAndContext.ctx;

    // Draw the image into the canvas.
    ctx.drawImage(img, 0, 0, width, height);

    // Read pixel data
    // Note: getImageData works on both OffscreenCanvas and normal canvas contexts.
    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, width, height);
    } catch (e) {
        throw new Error("Unable to read image data from canvas." + e.message);
    }
    const clamped = imageData.data; // Uint8ClampedArray
    const uint8Array = new Uint8Array(clamped);

    return uint8Array;
}

async function loadWorld(content) {
    let points = [];
    let numUniqueTextures = 0;
    let worldTexPathsToIdx = {};
    worldTextureData = [];
    worldTextureIndices = [];
    worldVertices = [];
    
    if (content === undefined) return; // load empty world

    const lines = content.split(/\r?\n/);
    for (let line of lines) {
        if (line.length === 0 || line.startsWith('#')) continue;
        if (line[0] == 'P') {
            // Point
            let point = parsePoint(line);
            points.push(point);
            // Always keep the last 3 points
            if (points.length > 3) {
                points.shift();
            }
        } else if (line[0] == 'T') {
            // Triangle
            let texPath = getParenContent(line);
            if (worldTexPathsToIdx[texPath] === undefined) {
                worldTexPathsToIdx[texPath] = numUniqueTextures++;
                const size = 64; // TODO maybe support dynamic texture size
                worldTextureData.push(await loadTextureAsUint8Array(texPath, size, size));
                worldTextureSizes.push(size); // width
                worldTextureSizes.push(size); // height
            }
            worldTextureIndices.push(worldTexPathsToIdx[texPath]);
            for (let point of points) {
                // A triangle's data is simply 9 floats
                worldVertices.push(point.x);
                worldVertices.push(point.y);
                worldVertices.push(point.z);
            }
        }
    }
}

