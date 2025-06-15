'use strict';

// Constants
const RENDER_BUF_H = 108;
const RENDER_BUF_W = Math.floor(RENDER_BUF_H * 16 / 9);
const PLAYER_VEL = 2.0;
const ARROW_ROT_SPEED = Math.PI / 2;
const MOUSE_SENSITIVITY = 0.002;
const GRAVITY = -4;
const PLAYER_FALL_SPEED_LIMIT = -6;
const PLAYER_JUMP_VEL = 4;
const ENTITY_HITBOX_SIZE_X = 0.5;
const ENTITY_HITBOX_SIZE_Y = 1;
const ENTITY_HITBOX_SIZE_Z = 0.5;
const LIGHT_DIRECTION_X = 0.0;
const LIGHT_DIRECTION_Y = 0.0;
const LIGHT_DIRECTION_Z = -1.0;
const AMBIENT_LIGHT = 0.5;
const DEATH_BARRIER_Y = -50.0;
const HITBOX_OVERLAP_MARGIN = 0.1;

let stepCounter = 0;
let playerX = 0.0;
let playerY = 0.0;
let playerZ = 0.0;
let playerAngleHorizontal = 0.0;
let playerAngleVertical = 0.0;
let playerVelY = 0.0;
let playerDead = false;
