/**
 * Ray-triangle intersection test (Möller–Trumbore-like but here explicit plane + inside-outside test).
 * No heap allocations inside (all scalar ops).
 *
 * @param {number} origX - Ray origin x
 * @param {number} origY - Ray origin y
 * @param {number} origZ - Ray origin z
 * @param {number} dirX - Ray direction x
 * @param {number} dirY - Ray direction y
 * @param {number} dirZ - Ray direction z
 * @param {number} v0x - Triangle vertex0 x
 * @param {number} v0y - Triangle vertex0 y
 * @param {number} v0z - Triangle vertex0 z
 * @param {number} v1x - Triangle vertex1 x
 * @param {number} v1y - Triangle vertex1 y
 * @param {number} v1z - Triangle vertex1 z
 * @param {number} v2x - Triangle vertex2 x
 * @param {number} v2y - Triangle vertex2 y
 * @param {number} v2z - Triangle vertex2 z
 * @returns {number} - If hit, t is the ray parameter at intersection, negative number otherwise.
 */
function rayTriangleIntersect(
    origX, origY, origZ,
    dirX, dirY, dirZ,
    v0x, v0y, v0z,
    v1x, v1y, v1z,
    v2x, v2y, v2z
) {
    // Compute edges v0v1 and v0v2
    const v0v1x = v1x - v0x;
    const v0v1y = v1y - v0y;
    const v0v1z = v1z - v0z;

    const v0v2x = v2x - v0x;
    const v0v2y = v2y - v0y;
    const v0v2z = v2z - v0z;

    // Compute normal N = v0v1 × v0v2
    const Nx = v0v1y * v0v2z - v0v1z * v0v2y;
    const Ny = v0v1z * v0v2x - v0v1x * v0v2z;
    const Nz = v0v1x * v0v2y - v0v1y * v0v2x;

    // Compute N·dir
    const NdotDir = Nx * dirX + Ny * dirY + Nz * dirZ;
    if (Math.abs(NdotDir) < 1e-8) {
        // Ray is parallel to triangle plane
        return -1.0;
    }

    // Compute plane constant d: plane equation N·P + d = 0; for P on triangle (e.g., v0)
    // => d = -N·v0
    const d = -(Nx * v0x + Ny * v0y + Nz * v0z);

    // Compute t: intersection with plane: N·(orig + t*dir) + d = 0
    // => t = -(N·orig + d) / (N·dir)
    const NdotOrig = Nx * origX + Ny * origY + Nz * origZ;
    const t = -(NdotOrig + d) / NdotDir;

    // If t < 0, triangle is behind ray origin
    if (t < 0) {
        return t;
    }

    // Compute intersection point P = orig + t * dir
    const Px = origX + t * dirX;
    const Py = origY + t * dirY;
    const Pz = origZ + t * dirZ;

    // Inside-Outside test: for each edge, compute cross(edge, P - vertex) and check same side as N

    // Edge 0: v0 -> v1
    // v0p = P - v0
    const v0pX = Px - v0x;
    const v0pY = Py - v0y;
    const v0pZ = Pz - v0z;
    // Ne = v0v1 × v0p
    let Nex = v0v1y * v0pZ - v0v1z * v0pY;
    let Ney = v0v1z * v0pX - v0v1x * v0pZ;
    let Nez = v0v1x * v0pY - v0v1y * v0pX;
    // N·Ne
    if (Nx * Nex + Ny * Ney + Nz * Nez < 0) {
        return -1.0;
    }

    // Edge 1: v1 -> v2 (or equivalently v2v1 = v2 - v1, but careful with orientation)
    // v2v1 = v2 - v1
    const v2v1x = v2x - v1x;
    const v2v1y = v2y - v1y;
    const v2v1z = v2z - v1z;
    // v1p = P - v1
    const v1pX = Px - v1x;
    const v1pY = Py - v1y;
    const v1pZ = Pz - v1z;
    // Ne = v2v1 × v1p
    Nex = v2v1y * v1pZ - v2v1z * v1pY;
    Ney = v2v1z * v1pX - v2v1x * v1pZ;
    Nez = v2v1x * v1pY - v2v1y * v1pX;
    if (Nx * Nex + Ny * Ney + Nz * Nez < 0) {
        return -1.0;
    }

    // Edge 2: v2 -> v0 (original C++ used v2v0 = v0 - v2, then cross with (P - v2))
    const v2v0x = v0x - v2x;
    const v2v0y = v0y - v2y;
    const v2v0z = v0z - v2z;
    // v2p = P - v2
    const v2pX = Px - v2x;
    const v2pY = Py - v2y;
    const v2pZ = Pz - v2z;
    // Ne = v2v0 × v2p
    Nex = v2v0y * v2pZ - v2v0z * v2pY;
    Ney = v2v0z * v2pX - v2v0x * v2pZ;
    Nez = v2v0x * v2pY - v2v0y * v2pX;
    if (Nx * Nex + Ny * Ney + Nz * Nez < 0) {
        return -1.0;
    }

    // All tests passed: intersection
    return t;
}

/**
 * Compute (u, v) such that:
 *   u * (v1 - v0) + v * (v2 - v0) = P - v0
 * for point P lying on the plane of triangle (v0, v1, v2).
 *
 * All inputs are scalars. Returns an object { u, v } if successful,
 * or null if the triangle is degenerate (area near zero) or if the
 * computation would be unstable (determinant near zero).
 *
 * @param {number} v0x - x-coordinate of triangle vertex v0
 * @param {number} v0y - y-coordinate of triangle vertex v0
 * @param {number} v0z - z-coordinate of triangle vertex v0
 * @param {number} v1x - x-coordinate of triangle vertex v1
 * @param {number} v1y - y-coordinate of triangle vertex v1
 * @param {number} v1z - z-coordinate of triangle vertex v1
 * @param {number} v2x - x-coordinate of triangle vertex v2
 * @param {number} v2y - y-coordinate of triangle vertex v2
 * @param {number} v2z - z-coordinate of triangle vertex v2
 * @param {number} Px  - x-coordinate of the point P on the same plane
 * @param {number} Py  - y-coordinate of the point P
 * @param {number} Pz  - z-coordinate of the point P
 * @returns {{u: number, v: number} | null}
 *    Returns null if the triangle is degenerate / determinant near zero.
 */
function computeTriangleUV(
    v0x, v0y, v0z,
    v1x, v1y, v1z,
    v2x, v2y, v2z,
    Px, Py, Pz
) {
    // Compute edge vectors e1 = v1 - v0, e2 = v2 - v0
    const e1x = v1x - v0x;
    const e1y = v1y - v0y;
    const e1z = v1z - v0z;

    const e2x = v2x - v0x;
    const e2y = v2y - v0y;
    const e2z = v2z - v0z;

    // Compute vector from v0 to P: w = P - v0
    const wx = Px - v0x;
    const wy = Py - v0y;
    const wz = Pz - v0z;

    // Compute dot products needed for 2x2 linear system:
    // [ dot(e1,e1)  dot(e1,e2) ] [u] = [ dot(e1, w) ]
    // [ dot(e1,e2)  dot(e2,e2) ] [v]   [ dot(e2, w) ]
    const dot11 = e1x * e1x + e1y * e1y + e1z * e1z;  // e1·e1
    const dot12 = e1x * e2x + e1y * e2y + e1z * e2z;  // e1·e2
    const dot22 = e2x * e2x + e2y * e2y + e2z * e2z;  // e2·e2

    const dot1w = e1x * wx + e1y * wy + e1z * wz;     // e1·w
    const dot2w = e2x * wx + e2y * wy + e2z * wz;     // e2·w

    // Compute determinant of the 2x2 system
    const det = dot11 * dot22 - dot12 * dot12;
    if (Math.abs(det) < 1e-8) {
        // Triangle is degenerate or nearly so (area ~ 0), cannot reliably compute (u,v).
        return null;
    }

    // Solve for u, v using Cramer's rule:
    // u = ( dot22 * dot1w - dot12 * dot2w ) / det
    // v = ( dot11 * dot2w - dot12 * dot1w ) / det
    const u = (dot22 * dot1w - dot12 * dot2w) / det;
    const v = (dot11 * dot2w - dot12 * dot1w) / det;

    return { u: u, v: v };
}
