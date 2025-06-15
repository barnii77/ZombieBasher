'use strict';

class Zombie {
    vertexOffset = 0;
    x = 0.0;
    y = 0.0;
    z = 0.0;
    spawnX = 0.0;
    spawnY = 0.0;
    spawnZ = 0.0;
    vy = 0.0;
    respawn = false;

    constructor(vertexOffset, point, respawn) {
        this.vertexOffset = vertexOffset;
        this.x = point.x;
        this.y = point.y;
        this.z = point.z;
        this.spawnX = point.x;
        this.spawnY = point.y;
        this.spawnZ = point.z;
        this.vy = 0.0;
        this.respawn = respawn;
    }

    moveQuad() {
        let offsets = [
            [-ENTITY_HITBOX_SIZE_X / 2.0, 0, 0],
            [ENTITY_HITBOX_SIZE_X / 2.0, 0, 0],
            [-ENTITY_HITBOX_SIZE_X / 2.0, -ENTITY_HITBOX_SIZE_Y, 0],
            [ENTITY_HITBOX_SIZE_X / 2.0, -ENTITY_HITBOX_SIZE_Y, 0],
            [ENTITY_HITBOX_SIZE_X / 2.0, 0, 0],
            [-ENTITY_HITBOX_SIZE_X / 2.0, -ENTITY_HITBOX_SIZE_Y, 0],
        ];
        let zombieViewDir = Vec3.normalize({x: playerX - this.x, y: 0.0, z: playerZ - this.z});
        let zUp = {x: 0.0, y: -1.0, z: 0.0};
        let zRight = Vec3.cross(zombieViewDir, zUp);
        let rotationMat = [
            zRight.x, zUp.x, zombieViewDir.x,
            zRight.y, zUp.y, zombieViewDir.y,
            zRight.z, zUp.z, zombieViewDir.z,
        ];
        for (let i = 0; i < 6; i++) {
            let pointOffset = 3 * i + this.vertexOffset;
            let [ox, oy, oz] = offsets[i];
            let p = mat3MultiplyVec3(rotationMat, ox, oy, oz);
            worldVertices[pointOffset] = this.x + p.x;
            worldVertices[pointOffset + 1] = this.y + p.y - ENTITY_HITBOX_SIZE_Y;
            worldVertices[pointOffset + 2] = this.z + p.z;
        }
    }

    getBodyTriangles() {
        return [Math.floor(this.vertexOffset / 9), Math.floor(this.vertexOffset / 9) + 1];
    }

    applyPhysics(dt) {
        this.y += this.vy * dt;
        this.vy += dt * GRAVITY;
        if (this.y < DEATH_BARRIER_Y) {
            this.die();
        }
    }

    applyPhysicsConstraints() {
        let adjust = applyPhysicsConstraints(this.x, this.y, this.z, this.getBodyTriangles());
        this.x = adjust.x;
        this.y = adjust.y;
        this.z = adjust.z;
        if (adjust.numCollisions > 0) {
            // No gravity if standing on something
            this.vy = 0.0;
        }
    }

    die() {
        if (this.respawn) {
            this.x = this.spawnX;
            this.y = this.spawnY;
            this.z = this.spawnZ;
        } else {
            for (let i = this.vertexOffset; i < this.vertexOffset + 2 * 3 * 3; i++) {
                worldVertices[i] = 0.0;
            }
            worldEntities = worldEntities.filter((entity) => !Object.is(entity, this));
        }
    }

    questionAllOfYourLifeChoicesAndAct(dt) {
        let dx = Math.random() * 2.0 - 1.0;
        let dz = Math.random() * 2.0 - 1.0;

        let zToP = {x: playerX - this.x, y: 0.0, z: playerZ - this.z};
        let distToP = Vec3.length(zToP);
        let viewDir = Vec3.normalize(zToP);
        let rcRes = castRay(this.x, this.y, this.z, viewDir.x, viewDir.y, viewDir.z);
        let t = rcRes.t;
        if (t < 0 || t >= distToP) {
            // Able to stare straight into the player's soul
            dx = viewDir.x;
            dz = viewDir.z;
        }
        this.x += dt * dx;
        this.z += dt * dz;
    }

    step(dt) {
        this.questionAllOfYourLifeChoicesAndAct(dt);
        this.applyPhysics(dt);
        this.applyPhysicsConstraints();
        this.moveQuad();
    }
}
