'use strict';

function initGame(canvas, ctx) {
    stepCounter = 0;
    initRenderBuffer(canvas, ctx);
}

function clampPlayerAngles() {
    // Keep horizontal angle in range -pi to pi
    playerAngleHorizontal = ((playerAngleHorizontal + Math.PI) % (2*Math.PI)) - Math.PI;

    // Clamp vertical angle so you cannot look too far up or down
    const maxVerticalAngle = Math.PI / 2 - 0.01;
    if (playerAngleVertical > maxVerticalAngle) playerAngleVertical = maxVerticalAngle;
    if (playerAngleVertical < -maxVerticalAngle) playerAngleVertical = -maxVerticalAngle;
}

function applyPhysicsConstraints() {
    // Apply physics constraints (i.e. triangle collisions). Limit the number of iterations so
    // the event loop doesn't hang if we do get terminally stuck in a wall.
    for (let i = 0; i < 10; i++) { // TODO set to true
        let center = { x: playerX, y: playerY - PLAYER_HITBOX_SIZE_Y / 2.0, z: playerZ };
        let collision = findMaxOverlapCollision(center, PLAYER_HITBOX_SIZE_X, PLAYER_HITBOX_SIZE_Y, PLAYER_HITBOX_SIZE_Z, worldVertices);
        if (collision === null) {
            break;
        }
        // Force player outside of triangle
        playerX += collision.mtv.x;
        playerY += collision.mtv.y;
        playerZ += collision.mtv.z;
    }
}

function step(dt) {
    let rotationMat = buildRotationMatrix3x3(playerAngleHorizontal, playerAngleVertical);
    let playerDir = mat3MultiplyVec3(rotationMat, 0, 0, 1);

    // This is done so when you are looking at the ground you still move with the same speed
    playerDir.y = 0;
    let mag = magnitude(playerDir.x, playerDir.y, playerDir.z);
    playerDir.x /= mag;
    playerDir.z /= mag;

    let playerVel = PLAYER_VEL * dt;
    let arrowRotSpeed = ARROW_ROT_SPEED * dt;
    
    // Handle wasd
    if (keyboard.isDown('KeyW')) {
        playerX += playerDir.x * playerVel;
        playerZ += playerDir.z * playerVel;
    }
    if (keyboard.isDown('KeyA')) {
        playerX -= playerDir.z * playerVel;
        playerZ += playerDir.x * playerVel;
    }
    if (keyboard.isDown('KeyS')) {
        playerX -= playerDir.x * playerVel;
        playerZ -= playerDir.z * playerVel;
    }
    if (keyboard.isDown('KeyD')) {
        playerX += playerDir.z * playerVel;
        playerZ -= playerDir.x * playerVel;
    }

    // Handle arrow keys (for camera)
    if (keyboard.isDown('ArrowLeft')) {
        playerAngleHorizontal -= arrowRotSpeed;
    }
    if (keyboard.isDown('ArrowRight')) {
        playerAngleHorizontal += arrowRotSpeed;
    }
    if (keyboard.isDown('ArrowUp')) {
        playerAngleVertical -= arrowRotSpeed;
    }
    if (keyboard.isDown('ArrowDown')) {
        playerAngleVertical += arrowRotSpeed;
    }
    clampPlayerAngles();

    // Apply gravity if map is loaded (note that it is just constant speed downward gravity)
    // TODO do gravity with acceleration so that I can add jumping
    if (worldVertices.length > 0) {
        playerY += GRAVITY * dt;
    }

    applyPhysicsConstraints();

    stepCounter++;
}

function gameOnMouseMove(dx, dy) {
    return; // TODO remove
    playerAngleHorizontal += dx * MOUSE_SENSITIVITY;
    playerAngleVertical -= dy * MOUSE_SENSITIVITY;
    clampPlayerAngles();
}

function isGameOver() {
    return false;
}
