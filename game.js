'use strict';

function initGame(canvas, ctx) {
    stepCounter = 0;
    initRenderBuffer(canvas, ctx);
}

function step(dt) {
    let rotationMat = buildRotationMatrix3x3(playerAngleHorizontal, playerAngleVertical);
    let playerDir = mat3MultiplyVec3(rotationMat, 0, 0, 1);

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

    stepCounter++;
}

function gameOnMouseMove(dx, dy) {
    return; // TODO remove
    playerAngleHorizontal += dx * MOUSE_SENSITIVITY;
    // Keep in range -pi to pi
    playerAngleHorizontal = ((playerAngleHorizontal + Math.PI) % (2*Math.PI)) - Math.PI;

    playerAngleVertical -= dy * MOUSE_SENSITIVITY;

    // Clamp so you can't look too far up or down
    const maxVerticalAngle = Math.PI / 2 - 0.01;
    if (playerAngleVertical > maxVerticalAngle) playerAngleVertical = maxVerticalAngle;
    if (playerAngleVertical < -maxVerticalAngle) playerAngleVertical = -maxVerticalAngle;
}

function isGameOver() {
    return false;
}
