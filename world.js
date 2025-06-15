'use strict';

let worldVertices = [];
let worldTextureData = [];
let worldTextureIndices = [];
let worldTextureSizes = [];
let worldInvertUVForTriangle = [];
let worldEntities = [];

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

    if (width === -1) {
        width = img.naturalWidth;
    }
    if (height === -1) {
        height = img.naturalHeight;
    }

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

function addPoint(line, points) {
    let point = parsePoint(line);
    points.push(point);
    // Always keep the last 3 points
    if (points.length > 3) {
        points.shift();
    }
}

async function addTriangle(line, points, numUniqueTextures, worldTexPathsToIdx) {
    let args = getParenContent(line).split(',');
    let texPath = args[0];
    if (worldTexPathsToIdx[texPath] === undefined) {
        worldTexPathsToIdx[texPath] = numUniqueTextures[0]++;
        const size = 128; // decide dynamically based on image size
        worldTextureData.push(await loadTextureAsUint8Array(texPath, size, size));
        worldTextureSizes.push(size); // width
        worldTextureSizes.push(size); // height
    }
    worldTextureIndices.push(worldTexPathsToIdx[texPath]);
    if (points.length !== 3) {
        throw Error("invalid world");
    }
    for (let point of points) {
        // A triangle's data is simply 9 floats
        worldVertices.push(point.x);
        worldVertices.push(point.y);
        worldVertices.push(point.z);
    }
    if (args[1] !== undefined) {
        worldInvertUVForTriangle.push(args[1].trim().toLowerCase() === "invert");
    } else {
        worldInvertUVForTriangle.push(false);
    }
}

async function addZombie(line, points, numUniqueTextures, worldTexPathsToIdx) {
    let args = getParenContent(line).split(",");
    let respawn = false;
    if (args[1] !== undefined && args[1].trim().toLowerCase() === "respawn") {
        respawn = true;
    }
    if (points.length === 0) {
        throw Error("invalid world");
    }
    let point = points[points.length - 1];
    let vertexOffset = worldVertices.length;

    // Construct entity geometry
    addPoint("P(0, 0, 0)", points);
    addPoint("P(0, 0, 0)", points);
    addPoint("P(0, 0, 0)", points);
    addTriangle("T(resources/zombie.jpg)", points, numUniqueTextures, worldTexPathsToIdx);
    addTriangle("T(resources/zombie.jpg, invert)", points, numUniqueTextures, worldTexPathsToIdx);

    worldEntities.push(new Zombie(vertexOffset, point, respawn));
}

function addEntity(line, points, numUniqueTextures, worldTexPathsToIdx) {
    let args = getParenContent(line).split(",");
    let etype = args[0];
    if (etype === "zombie") {
        addZombie(line, points, numUniqueTextures, worldTexPathsToIdx);
    } else {
        throw Error("Unknown etype " + etype);
    }
}

async function loadWorld(content) {
    let points = [];
    let numUniqueTextures = [0];
    let worldTexPathsToIdx = {};
    worldTextureData = [];
    worldTextureIndices = [];
    worldVertices = [];
    
    if (content === undefined) return; // load empty world

    const lines = content.split(/\r?\n/);
    for (let line of lines) {
        if (line.length === 0 || line.startsWith('#')) continue;
        if (line[0] == 'P') {
            addPoint(line, points);
        } else if (line[0] == 'T') {
            await addTriangle(line, points, numUniqueTextures, worldTexPathsToIdx);
        } else if (line[0] == 'E') {
            await addEntity(line, points, numUniqueTextures, worldTexPathsToIdx);
        }
    }
}

