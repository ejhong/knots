/**
 * Anchors pin things to the skin by topology rather than by coordinates:
 * a triangle of the fine mesh plus barycentric weights. Because the mesh
 * topology never changes, an anchored acupoint on the wrist stays on the
 * wrist from infancy to old age.
 */
export interface Anchor {
  tri: number;
  u: number;
  v: number;
}

/** Packed anchors for bulk evaluation. */
export interface AnchorSet {
  tri: Uint32Array;
  uv: Float32Array; // u, v interleaved
  count: number;
}

export function packAnchors(list: Anchor[]): AnchorSet {
  const tri = new Uint32Array(list.length);
  const uv = new Float32Array(list.length * 2);
  list.forEach((a, i) => {
    tri[i] = a.tri;
    uv[i * 2] = a.u;
    uv[i * 2 + 1] = a.v;
  });
  return { tri, uv, count: list.length };
}

/** Evaluates positions (and optionally normals) of anchors on a mesh state. */
export function evalAnchors(
  set: AnchorSet,
  triangles: ArrayLike<number>,
  positions: Float32Array,
  normals: Float32Array | null,
  outPos: Float32Array,
  outNrm?: Float32Array,
  offset = 0,
) {
  for (let i = 0; i < set.count; i++) {
    const t = set.tri[i] * 3;
    const a = triangles[t] * 3;
    const b = triangles[t + 1] * 3;
    const c = triangles[t + 2] * 3;
    const u = set.uv[i * 2];
    const v = set.uv[i * 2 + 1];
    const w = 1 - u - v;
    const o = i * 3;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    if (normals) {
      nx = normals[a] * w + normals[b] * u + normals[c] * v;
      ny = normals[a + 1] * w + normals[b + 1] * u + normals[c + 1] * v;
      nz = normals[a + 2] * w + normals[b + 2] * u + normals[c + 2] * v;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      if (outNrm) {
        outNrm[o] = nx;
        outNrm[o + 1] = ny;
        outNrm[o + 2] = nz;
      }
    }
    outPos[o] = positions[a] * w + positions[b] * u + positions[c] * v + nx * offset;
    outPos[o + 1] = positions[a + 1] * w + positions[b + 1] * u + positions[c + 1] * v + ny * offset;
    outPos[o + 2] = positions[a + 2] * w + positions[b + 2] * u + positions[c + 2] * v + nz * offset;
  }
}

/** Nearest fine vertex of an anchor (largest barycentric weight). */
export function anchorVertex(a: Anchor, triangles: ArrayLike<number>): number {
  const w = 1 - a.u - a.v;
  const t = a.tri * 3;
  if (w >= a.u && w >= a.v) return triangles[t];
  return a.u >= a.v ? triangles[t + 1] : triangles[t + 2];
}

export function evalAnchor(a: Anchor, triangles: ArrayLike<number>, positions: Float32Array): [number, number, number] {
  const t = a.tri * 3;
  const i0 = triangles[t] * 3;
  const i1 = triangles[t + 1] * 3;
  const i2 = triangles[t + 2] * 3;
  const w = 1 - a.u - a.v;
  return [
    positions[i0] * w + positions[i1] * a.u + positions[i2] * a.v,
    positions[i0 + 1] * w + positions[i1 + 1] * a.u + positions[i2 + 1] * a.v,
    positions[i0 + 2] * w + positions[i1 + 2] * a.u + positions[i2 + 2] * a.v,
  ];
}
