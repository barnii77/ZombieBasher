// NOTE: this file was made with the help of ChatGPT because it is extremely math heavy

/**
 * Clip a convex polygon (in 3D) against a half-space plane: keep points P such that n·P >= d.
 * Uses Sutherland–Hodgman style clipping in 3D.
 *
 * @param {Array<{x,y,z}>} polyPts - Array of vertices (in order) of the convex polygon. May be 3 vertices initially.
 * @param {{x,y,z}} n - plane normal vector.
 * @param {number} d - plane offset: keep points where dot(n, P) >= d.
 * @returns {Array<{x,y,z}>} - new array of vertices after clipping; possibly empty.
 */
function clipPolygonFace(polyPts, n, d) {
  const outPts = [];
  const N = polyPts.length;
  if (N === 0) return outPts;
  // Compute signed distances for each vertex
  const dists = new Array(N);
  for (let i = 0; i < N; i++) {
    dists[i] = Vec3.dot(n, polyPts[i]) - d;
  }
  // Iterate edges
  for (let i = 0; i < N; i++) {
    const curr = polyPts[i];
    const next = polyPts[(i+1)%N];
    const distCurr = dists[i];
    const distNext = dists[(i+1)%N];
    const currInside = distCurr >= 0;
    const nextInside = distNext >= 0;
    if (currInside && nextInside) {
      // both inside: keep next
      outPts.push(next);
    } else if (currInside && !nextInside) {
      // leaving: compute intersection, keep intersection
      const t = distCurr / (distCurr - distNext);
      const ip = {
        x: curr.x + t*(next.x - curr.x),
        y: curr.y + t*(next.y - curr.y),
        z: curr.z + t*(next.z - curr.z),
      };
      outPts.push(ip);
    } else if (!currInside && nextInside) {
      // entering: compute intersection, keep intersection and next
      const t = distCurr / (distCurr - distNext);
      const ip = {
        x: curr.x + t*(next.x - curr.x),
        y: curr.y + t*(next.y - curr.y),
        z: curr.z + t*(next.z - curr.z),
      };
      outPts.push(ip);
      outPts.push(next);
    }
    // else both outside: keep none
  }
  return outPts;
}

/**
 * Compute area of a planar convex polygon given its vertices in 3D.
 * The polygon is assumed planar. We triangulate fan-wise around vertex 0:
 * area = sum_{i=1 to n-2} 0.5 * | cross( v[i] - v0, v[i+1] - v0 ) |
 *
 * @param {Array<{x,y,z}>} polyPts - array of >=3 vertices in order, planar convex polygon.
 * @returns {number} area; if <3 vertices, returns 0.
 */
function computePolygonArea3D(polyPts) {
  const n = polyPts.length;
  if (n < 3) return 0;
  let area = 0;
  const v0 = polyPts[0];
  for (let i = 1; i < n-1; i++) {
    const vi = Vec3.sub(polyPts[i], v0);
    const vj = Vec3.sub(polyPts[i+1], v0);
    const cr = Vec3.cross(vi, vj);
    area += 0.5 * Vec3.length(cr);
  }
  return area;
}

/**
 * SAT test between an axis-aligned box (AABB) and a triangle, returning the Minimum Translation Vector (MTV)
 * that moves the box out of intersection with the triangle. The push along the triangle-normal axis is computed
 * by plane–box overlap, so you correctly get pushed “up” when standing on the triangle.
 *
 * @param {{x,y,z}} boxCenter - center of the AABB.
 * @param {{x,y,z}} extents - half-sizes of the AABB (sizeX/2, sizeY/2, sizeZ/2).
 * @param {{x,y,z}} v0, v1, v2 - triangle vertices.
 * @returns { null | { mtv: {x,y,z} } }
 */
function satAabbTriangleMTV(boxCenter, extents, v0, v1, v2) {
  // Box axes for AABB: world axes
  const axesBox = [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ];
  const ex = extents.x, ey = extents.y, ez = extents.z;

  // Triangle edges
  const E0 = Vec3.sub(v1, v0);
  const E1 = Vec3.sub(v2, v1);
  const E2 = Vec3.sub(v0, v2);

  // Triangle normal (unnormalized)
  const NtriUn = Vec3.cross(E0, Vec3.sub(v2, v0));
  const Nlen = Vec3.length(NtriUn);
  if (Nlen < 1e-6) {
    // Degenerate triangle: treat as no intersection or fallback
    return null;
  }
  const Nnorm = { x: NtriUn.x / Nlen, y: NtriUn.y / Nlen, z: NtriUn.z / Nlen };

  // 1) Handle triangle-normal axis by plane–box overlap.
  // Plane: Nnorm · X + d = 0, with point v0 on plane => d = -Nnorm·v0
  const d = -Vec3.dot(Nnorm, v0);
  const dist = Vec3.dot(Nnorm, boxCenter) + d;  // signed distance from box center to triangle plane
  // Box projection radius onto normal:
  const rplane = ex * Math.abs(Nnorm.x) + ey * Math.abs(Nnorm.y) + ez * Math.abs(Nnorm.z);
  if (rplane - Math.abs(dist) <= 1e-6) {
    // No overlap with plane: box entirely on one side beyond half-extent -> no intersection
    return null;
  }
  // There is plane–box overlap: penetration depth along normal = rplane - |dist|.
  // Determine direction: if box center is below plane (dist < 0), push negative normal.
  const signPlane = (dist < 0) ? -1 : +1;
  const overlapPlane = rplane - Math.abs(dist);
  // Initialize minOverlap and minAxis from triangle-normal axis.
  let minOverlap = overlapPlane;
  let minAxis = { x: Nnorm.x * signPlane, y: Nnorm.y * signPlane, z: Nnorm.z * signPlane };

  // Helper to test other axes (box axes and edge-cross axes).
  // We skip updating MTV on axes where the triangle projected span is near zero.
  function testAxis(axis) {
    const axisLen2 = Vec3.dot(axis, axis);
    if (axisLen2 < 1e-6) {
      // degenerate axis -> skip
      return false;
    }
    const axisLen = Math.sqrt(axisLen2);
    // unit axis
    const A = { x: axis.x / axisLen, y: axis.y / axisLen, z: axis.z / axisLen };

    // Box projection
    const pC = Vec3.dot(A, boxCenter);
    const r = ex * Math.abs(A.x) + ey * Math.abs(A.y) + ez * Math.abs(A.z);

    // Triangle projection
    const p0 = Vec3.dot(A, v0);
    const p1 = Vec3.dot(A, v1);
    const p2 = Vec3.dot(A, v2);
    const tmin = Math.min(p0, p1, p2);
    const tmax = Math.max(p0, p1, p2);
    const bmin = pC - r;
    const bmax = pC + r;

    // Separation test
    if (bmax < tmin || tmax < bmin) {
      // Separating axis -> no intersection
      return true;
    }
    // Overlap amount
    const overlap = Math.min(bmax, tmax) - Math.max(bmin, tmin);
    // Triangle projected span
    const triSpan = tmax - tmin;
    const EPS_SPAN = 1e-6;
    if (triSpan > EPS_SPAN) {
      // Only consider positive-overlap axes for MTV
      if (overlap > 0 && overlap < minOverlap) {
        // Determine direction: push box center along ±A so as to move it away from triangle.
        // Heuristic: compare box center projection vs triangle center projection
        const triCenterProj = (tmin + tmax) * 0.5;
        const sign = (pC < triCenterProj) ? -1 : +1;
        minOverlap = overlap;
        minAxis = { x: A.x * sign, y: A.y * sign, z: A.z * sign };
      }
      // If overlap <= 0: they just touch in projection; treat as overlapping (not separation), but skip MTV update.
    }
    // If triSpan <= EPS, skip updating MTV (this axis is near-zero thickness for triangle).
    return false;
  }

  // 2) Test box axes
  for (let i = 0; i < 3; i++) {
    if (testAxis(axesBox[i])) {
      return null;
    }
  }
  // 3) Test cross-product axes: box axes × triangle edges
  const edges = [E0, E1, E2];
  for (let i = 0; i < 3; i++) {
    const axisBox = axesBox[i];
    for (let j = 0; j < 3; j++) {
      const axis = Vec3.cross(axisBox, edges[j]);
      if (Vec3.dot(axis, axis) < 1e-6) continue;
      if (testAxis(axis)) {
        return null;
      }
    }
  }

  // If we reach here, intersection confirmed.
  // minOverlap and minAxis have been initialized from the triangle-normal axis
  // (which always had a positive overlapPlane) and possibly overridden by another axis only if truly smaller.
  // Compose MTV:
  const mtv = Vec3.scale(minAxis, minOverlap);
  return { mtv };
}

/**
 * Compute area of overlap between a triangle and an axis-aligned box (AABB) by clipping the triangle
 * against the box's six half-space planes, then computing the area of the resulting convex polygon.
 *
 * @param {{x,y,z}} boxCenter - center of the AABB.
 * @param {{x,y,z}} extents - half-sizes of the AABB along x,y,z.
 * @param {{x,y,z}} v0, v1, v2 - triangle vertices.
 * @returns {number} - area of the portion of triangle inside the box. Zero if no overlap.
 */
function triangleBoxOverlapArea(boxCenter, extents, v0, v1, v2) {
  // Compute box min/max
  const minX = boxCenter.x - extents.x;
  const maxX = boxCenter.x + extents.x;
  const minY = boxCenter.y - extents.y;
  const maxY = boxCenter.y + extents.y;
  const minZ = boxCenter.z - extents.z;
  const maxZ = boxCenter.z + extents.z;

  // Start polygon as the triangle vertices in order
  let poly = [ {x: v0.x, y: v0.y, z: v0.z},
               {x: v1.x, y: v1.y, z: v1.z},
               {x: v2.x, y: v2.y, z: v2.z} ];

  // Clip against each of the 6 planes: n·P >= d
  // x >= minX: n=(1,0,0), d=minX
  poly = clipPolygonFace(poly, { x: 1, y: 0, z: 0 }, minX);
  if (poly.length === 0) return 0;
  // x <= maxX -> -x >= -maxX: n = (-1,0,0), d = -maxX
  poly = clipPolygonFace(poly, { x: -1, y: 0, z: 0 }, -maxX);
  if (poly.length === 0) return 0;
  // y >= minY
  poly = clipPolygonFace(poly, { x: 0, y: 1, z: 0 }, minY);
  if (poly.length === 0) return 0;
  // y <= maxY
  poly = clipPolygonFace(poly, { x: 0, y: -1, z: 0 }, -maxY);
  if (poly.length === 0) return 0;
  // z >= minZ
  poly = clipPolygonFace(poly, { x: 0, y: 0, z: 1 }, minZ);
  if (poly.length === 0) return 0;
  // z <= maxZ
  poly = clipPolygonFace(poly, { x: 0, y: 0, z: -1 }, -maxZ);
  if (poly.length === 0) return 0;

  // Now poly is the clipped convex polygon (planar) in 3D. Compute its area.
  return computePolygonArea3D(poly);
}

/**
 * Main function: given an AABB (center + sizes) and a flat triangle array, finds the triangle
 * that intersects and has the maximum overlap area, returning its index, overlap area, and MTV.
 *
 * @param {{x:number, y:number, z:number}} center - center of the axis-aligned box.
 * @param {number} sizeX - full size along X.
 * @param {number} sizeY - full size along Y.
 * @param {number} sizeZ - full size along Z.
 * @param {Array<number>} trianglesFlat - flat array of numbers: length multiple of 9. For triangle i:
 *        v0 = ( trianglesFlat[9*i],   trianglesFlat[9*i+1],   trianglesFlat[9*i+2] )
 *        v1 = ( trianglesFlat[9*i+3], trianglesFlat[9*i+4],   trianglesFlat[9*i+5] )
 *        v2 = ( trianglesFlat[9*i+6], trianglesFlat[9*i+7],   trianglesFlat[9*i+8] )
 * @returns { null | { triangleIndex: number, overlapArea: number, mtv: {x,y,z} } }
 */
function findMaxOverlapCollision(center, sizeX, sizeY, sizeZ, trianglesFlat, ignoreTriangles) {
  // Validate input length
  if (!Array.isArray(trianglesFlat) || (trianglesFlat.length % 9) !== 0) {
    throw new Error("trianglesFlat must be an array with length multiple of 9");
  }

  const extents = { x: sizeX / 2, y: sizeY / 2, z: sizeZ / 2 };
  const boxCenter = { x: center.x, y: center.y, z: center.z };

  const triCount = trianglesFlat.length / 9;
  let best = null;
  let bestArea = 0;

  for (let i = 0; i < triCount; i++) {
    if (ignoreTriangles.includes(i)) {
      continue;
    }
    const base = 9 * i;
    const v0 = {
      x: trianglesFlat[base],
      y: trianglesFlat[base+1],
      z: trianglesFlat[base+2]
    };
    const v1 = {
      x: trianglesFlat[base+3],
      y: trianglesFlat[base+4],
      z: trianglesFlat[base+5]
    };
    const v2 = {
      x: trianglesFlat[base+6],
      y: trianglesFlat[base+7],
      z: trianglesFlat[base+8]
    };
    // First, SAT test & get MTV (or null if no intersection)
    const satRes = satAabbTriangleMTV(boxCenter, extents, v0, v1, v2);
    if (satRes === null) {
      continue; // no intersection
    }
    // Compute overlap area by clipping
    const area = triangleBoxOverlapArea(boxCenter, extents, v0, v1, v2);
    if (area > bestArea) {
      bestArea = area;
      best = {
        triangleIndex: i,
        overlapArea: area,
        mtv: satRes.mtv
      };
    }
  }

  return best; // either null (if no intersection) or object
}

// Example usage:
// const center = { x: 0, y: 0, z: 0 };
// const sizeX = 2, sizeY = 2, sizeZ = 2;
// const triangles = [
//   // one triangle far away, no intersect
//   5,5,5, 6,5,5, 5,6,5,
//   // one triangle intersecting
//   0.5,0.5,0.5, 1.5,0.5,0.5, 0.5,1.5,0.5
// ];
// const res = findMaxOverlapCollision(center, sizeX, sizeY, sizeZ, triangles);
// console.log(res);
// Might print something like:
// { triangleIndex: 1, overlapArea: <some positive>, mtv: { x: ..., y: ..., z: ... } }

