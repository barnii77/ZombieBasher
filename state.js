'use strict';

// Constants
const RENDER_BUF_H = 144;
const RENDER_BUF_W = Math.floor(RENDER_BUF_H * 16 / 9);
const PLAYER_VEL = 1.0;
const ARROW_ROT_SPEED = Math.PI / 2;
const MOUSE_SENSITIVITY = 0.002;
const GRAVITY = -3;
const PLAYER_HITBOX_SIZE_X = 0.5;
const PLAYER_HITBOX_SIZE_Y = 1;
const PLAYER_HITBOX_SIZE_Z = 0.5;

let stepCounter = 0;
let playerX = 0.0;
let playerY = 0.0;
let playerZ = 0.0;
let playerAngleHorizontal = 0.0;
let playerAngleVertical = 0.0;
