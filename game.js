'use strict';

let playerGunshotAudioElem = null;

function initGame(canvas, ctx) {
    stepCounter = 0;
    initRenderBuffer(canvas, ctx);
    playerGunshotAudioElem = document.getElementById("gunshotAudio");
}

function clampPlayerAngles() {
    // Keep horizontal angle in range -pi to pi
    playerAngleHorizontal = ((playerAngleHorizontal + Math.PI) % (2*Math.PI)) - Math.PI;

    // Clamp vertical angle so you cannot look too far up or down
    const maxVerticalAngle = Math.PI / 2 - 0.01;
    if (playerAngleVertical > maxVerticalAngle) playerAngleVertical = maxVerticalAngle;
    if (playerAngleVertical < -maxVerticalAngle) playerAngleVertical = -maxVerticalAngle;
}

function applyPhysicsConstraints(x, y, z, ignoreTriangles) {
    // Apply physics constraints (i.e. triangle collisions). Limit the number of iterations so
    // the event loop doesn't hang if we do get terminally stuck in a wall.
    if (ignoreTriangles === undefined) ignoreTriangles = [];
    let i;
    for (i = 0; i < 10; i++) {
        let center = { x: x, y: y - ENTITY_HITBOX_SIZE_Y / 2.0, z: z };
        let collision = findMaxOverlapCollision(center, ENTITY_HITBOX_SIZE_X, ENTITY_HITBOX_SIZE_Y, ENTITY_HITBOX_SIZE_Z, worldVertices, ignoreTriangles);
        if (collision === null) {
            break;
        }
        // Force player outside of triangle
        x += collision.mtv.x;
        y += collision.mtv.y;
        z += collision.mtv.z;
    }
    return {numCollisions: i, x: x, y: y, z: z};
}


function hitboxesOverlap(centerA, centerB) {
  const halfSizeX = ENTITY_HITBOX_SIZE_X / 2 + HITBOX_OVERLAP_MARGIN;
  const halfSizeY = ENTITY_HITBOX_SIZE_Y / 2 + HITBOX_OVERLAP_MARGIN;
  const halfSizeZ = ENTITY_HITBOX_SIZE_Z / 2 + HITBOX_OVERLAP_MARGIN;

  const overlapX = Math.abs(centerA.x - centerB.x) < ENTITY_HITBOX_SIZE_X;
  const overlapY = Math.abs(centerA.y - centerB.y) < ENTITY_HITBOX_SIZE_Y;
  const overlapZ = Math.abs(centerA.z - centerB.z) < ENTITY_HITBOX_SIZE_Z;

  return overlapX && overlapY && overlapZ;
}

function headToCenter(x, y, z) {
    return {x: x - ENTITY_HITBOX_SIZE_X / 2.0, y: y - ENTITY_HITBOX_SIZE_Y / 2.0, z: z - ENTITY_HITBOX_SIZE_Z / 2.0}
}

function playerDie() {
    playerDead = true;
    // Redirect to GTA wasted meme on yt
    window.location.href = "https://yewtu.be/watch?v=yJsozdAduwc&autoplay=1";
}

function playerShoot() {
    let playerViewDir = mat3MultiplyVec3(buildRotationMatrix3x3(playerAngleHorizontal, playerAngleVertical), 0, 0, 1);
    let rcRes = castRay(playerX, playerY, playerZ, playerViewDir.x, playerViewDir.y, playerViewDir.z);
    for (let entity of worldEntities) {
        if (entity.getBodyTriangles().includes(rcRes.triangleIdx)) {
            entity.die();
        }
    }
    playerGunshotAudioElem.play();
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

    let playerWantsToJump = keyboard.isDown('Space');

    clampPlayerAngles();

    playerY += playerVelY * dt;

    // Apply gravity if map is loaded (note that it is just constant speed downward gravity)
    if (worldVertices.length > 0) {
        playerVelY += GRAVITY * dt; // TODO this kind of logic should be put in a separate loop with fixed ticks/s
    }
    if (playerVelY < PLAYER_FALL_SPEED_LIMIT) {
        playerVelY = PLAYER_FALL_SPEED_LIMIT;
    }

    if (primaryMouseButtonDown) {
        playerShoot();
        primaryMouseButtonDown = false;
    }
    if (playerY < DEATH_BARRIER_Y) {
        playerDie();
    }

    for (let entity of worldEntities) {
        entity.step(dt);
        if (hitboxesOverlap(headToCenter(playerX, playerY, playerZ), headToCenter(entity.x, entity.y, entity.z))) {
            playerDie();
        }
    }

    let adjust = applyPhysicsConstraints(playerX, playerY, playerZ);
    let numCollisions = adjust.numCollisions;

    playerX = adjust.x;
    playerY = adjust.y;
    playerZ = adjust.z;

    if (numCollisions > 0) {
        // No gravity if standing on something
        playerVelY = 0.0;
        if (playerWantsToJump) {
            // Can jump if standing on something
            playerVelY = PLAYER_JUMP_VEL;
        }
    }

    stepCounter++;
}

function gameOnMouseMove(dx, dy) {
    playerAngleHorizontal += dx * MOUSE_SENSITIVITY;
    playerAngleVertical -= dy * MOUSE_SENSITIVITY;
    clampPlayerAngles();
}

function isGameOver() {
    return playerDead;
}
