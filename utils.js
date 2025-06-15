function newInvisibleCanvas(width, height) {
    // Create OffscreenCanvas if supported, otherwise fallback to hidden <canvas>
    let canvas, ctx;
    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("OffscreenCanvas: Unable to get 2D context");
        }
    } else {
        // Fallback for environments without OffscreenCanvas (older browsers)
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Fallback canvas: Unable to get 2D context");
        }
    }

    // Clear any existing contents (mostly relevant for fallback DOM canvas):
    ctx.clearRect(0, 0, width, height);

    return {canvas: canvas, ctx: ctx};
}

/**
 * Multiply a 3×3 matrix by a 3-component vector.
 *
 * Matrix is in row-major order:
 *   [ m00 m01 m02 ]
 *   [ m10 m11 m12 ]
 *   [ m20 m21 m22 ]
 *
 * Computes:
 *   result.x = m00*vx + m01*vy + m02*vz
 *   result.y = m10*vx + m11*vy + m12*vz
 *   result.z = m20*vx + m21*vy + m22*vz
 *
 * @param {number} m00
 * @param {number} m01
 * @param {number} m02
 * @param {number} m10
 * @param {number} m11
 * @param {number} m12
 * @param {number} m20
 * @param {number} m21
 * @param {number} m22
 * @param {number} vx - vector x component
 * @param {number} vy - vector y component
 * @param {number} vz - vector z component
 * @returns {{ x: number, y: number, z: number }} - the product matrix * vector
 */
function mat3MultiplyVec3(
    matrix,
    vx, vy, vz
) {
    const x = matrix[0] * vx + matrix[1] * vy + matrix[2] * vz;
    const y = matrix[3] * vx + matrix[4] * vy + matrix[5] * vz;
    const z = matrix[6] * vx + matrix[7] * vy + matrix[8] * vz;
    return { x, y, z };
}

/**
 * Build a 3×3 rotation matrix (row-major, flat array length 9) from
 * Euler angles: horizontal (yaw), vertical (pitch), and roll (around view direction),
 * applied in that order (intrinsic rotations).
 *
 * Coordinate system: right-handed, X right, Y up, Z forward.
 * The result R satisfies: v' = R * v for column-vector v.
 *
 * @param {number} yaw    - horizontal rotation angle in radians (around Y axis)
 * @param {number} pitch  - vertical rotation angle in radians (around X axis)
 * @param {number} roll   - roll rotation angle in radians (around Z axis)
 * @returns {number[]}    - flat array of length 9, row-major:
 *   [ m00, m01, m02,
 *     m10, m11, m12,
 *     m20, m21, m22 ]
 */
function buildRotationMatrix3x3(rx, ry) {
    let yaw = 0.0;
    let pitch = rx;
    let roll = ry;
    // Precompute sines and cosines
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);

    // Row-major 3x3 rotation matrix
    return [
        cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr,
        sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr,
        -sp,     cp * sr,                cp * cr
    ];
}

function magnitude(x, y, z) {
	return Math.sqrt(x * x + y * y + z * z);
}

