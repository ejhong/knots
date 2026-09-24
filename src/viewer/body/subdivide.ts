/**
 * One level of Catmull–Clark subdivision for a closed quad mesh, expressed as a
 * sparse linear stencil: fine = S · coarse. The stencil is built once per
 * topology and re-applied whenever the coarse positions change (age morphs),
 * which costs a few milliseconds for the ~13k-quad body.
 *
 * Fine vertex order: [coarse vertex points | edge points | face points].
 */
export interface Subdivision {
  coarseVertexCount: number;
  fineVertexCount: number;
  /** Fine quads (4 indices each), orientation preserved. */
  fineQuads: Uint32Array;
  /** CSR stencil. */
  rowPtr: Int32Array;
  cols: Int32Array;
  weights: Float32Array;
  /** Coarse edge list (a, b pairs), exposed for graph algorithms. */
  edges: Int32Array;
}

export function buildSubdivision(vertexCount: number, quads: ArrayLike<number>): Subdivision {
  const F = quads.length / 4;
  const V = vertexCount;

  // Edge table.
  const edgeKey = (a: number, b: number) => (a < b ? a * V + b : b * V + a);
  const edgeIndex = new Map<number, number>();
  const edgeA: number[] = [];
  const edgeB: number[] = [];
  const edgeFaces: number[] = []; // two per edge
  const quadEdges = new Int32Array(F * 4);
  for (let f = 0; f < F; f++) {
    for (let k = 0; k < 4; k++) {
      const a = quads[f * 4 + k];
      const b = quads[f * 4 + ((k + 1) & 3)];
      const key = edgeKey(a, b);
      let e = edgeIndex.get(key);
      if (e === undefined) {
        e = edgeA.length;
        edgeIndex.set(key, e);
        edgeA.push(a);
        edgeB.push(b);
        edgeFaces.push(f, -1);
      } else {
        edgeFaces[e * 2 + 1] = f;
      }
      quadEdges[f * 4 + k] = e;
    }
  }
  const E = edgeA.length;
  for (let e = 0; e < E; e++) {
    if (edgeFaces[e * 2 + 1] < 0) throw new Error('subdivision expects a closed mesh');
  }

  // Vertex adjacency.
  const vFaces: number[][] = Array.from({ length: V }, () => []);
  const vEdges: number[][] = Array.from({ length: V }, () => []);
  for (let f = 0; f < F; f++) for (let k = 0; k < 4; k++) vFaces[quads[f * 4 + k]].push(f);
  for (let e = 0; e < E; e++) {
    vEdges[edgeA[e]].push(e);
    vEdges[edgeB[e]].push(e);
  }

  const rows: Map<number, number>[] = [];
  const add = (row: Map<number, number>, c: number, w: number) => row.set(c, (row.get(c) ?? 0) + w);

  // Vertex points.
  for (let v = 0; v < V; v++) {
    const n = vEdges[v].length;
    const row = new Map<number, number>();
    add(row, v, (n - 3) / n);
    const wf = 1 / (n * n) / 4;
    for (const f of vFaces[v]) for (let k = 0; k < 4; k++) add(row, quads[f * 4 + k], wf);
    const we = 1 / (n * n);
    for (const e of vEdges[v]) {
      add(row, edgeA[e], we);
      add(row, edgeB[e], we);
    }
    rows.push(row);
  }
  // Edge points.
  for (let e = 0; e < E; e++) {
    const row = new Map<number, number>();
    add(row, edgeA[e], 0.25);
    add(row, edgeB[e], 0.25);
    for (const f of [edgeFaces[e * 2], edgeFaces[e * 2 + 1]])
      for (let k = 0; k < 4; k++) add(row, quads[f * 4 + k], 1 / 16);
    rows.push(row);
  }
  // Face points.
  for (let f = 0; f < F; f++) {
    const row = new Map<number, number>();
    for (let k = 0; k < 4; k++) add(row, quads[f * 4 + k], 0.25);
    rows.push(row);
  }

  const N = rows.length;
  const rowPtr = new Int32Array(N + 1);
  let nnz = 0;
  rows.forEach((r, i) => {
    rowPtr[i] = nnz;
    nnz += r.size;
  });
  rowPtr[N] = nnz;
  const cols = new Int32Array(nnz);
  const weights = new Float32Array(nnz);
  rows.forEach((r, i) => {
    let j = rowPtr[i];
    for (const [c, w] of r) {
      cols[j] = c;
      weights[j] = w;
      j++;
    }
  });

  // Fine topology.
  const fineQuads = new Uint32Array(F * 16);
  for (let f = 0; f < F; f++) {
    const fp = V + E + f;
    for (let k = 0; k < 4; k++) {
      const v = quads[f * 4 + k];
      const eNext = V + quadEdges[f * 4 + k];
      const ePrev = V + quadEdges[f * 4 + ((k + 3) & 3)];
      const o = f * 16 + k * 4;
      fineQuads[o] = v;
      fineQuads[o + 1] = eNext;
      fineQuads[o + 2] = fp;
      fineQuads[o + 3] = ePrev;
    }
  }

  const edges = new Int32Array(E * 2);
  for (let e = 0; e < E; e++) {
    edges[e * 2] = edgeA[e];
    edges[e * 2 + 1] = edgeB[e];
  }

  return { coarseVertexCount: V, fineVertexCount: N, fineQuads, rowPtr, cols, weights, edges };
}

/** Applies the stencil to xyz-interleaved coarse data, writing into `out`. */
export function applySubdivision(s: Subdivision, coarse: Float32Array, out: Float32Array, stride = 3) {
  const { rowPtr, cols, weights } = s;
  for (let r = 0; r < s.fineVertexCount; r++) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let j = rowPtr[r], end = rowPtr[r + 1]; j < end; j++) {
      const c = cols[j] * stride;
      const w = weights[j];
      x += w * coarse[c];
      y += w * coarse[c + 1];
      z += w * coarse[c + 2];
    }
    const o = r * stride;
    out[o] = x;
    out[o + 1] = y;
    out[o + 2] = z;
  }
}

/** Applies the stencil to a scalar per-vertex field. */
export function applySubdivisionScalar(s: Subdivision, coarse: ArrayLike<number>, out: Float32Array) {
  const { rowPtr, cols, weights } = s;
  for (let r = 0; r < s.fineVertexCount; r++) {
    let x = 0;
    for (let j = rowPtr[r], end = rowPtr[r + 1]; j < end; j++) x += weights[j] * coarse[cols[j]];
    out[r] = x;
  }
}

/** Splits quads into triangles (a,b,c)(a,c,d). */
export function quadsToTriangles(quads: ArrayLike<number>): Uint32Array {
  const F = quads.length / 4;
  const tris = new Uint32Array(F * 6);
  for (let f = 0; f < F; f++) {
    const a = quads[f * 4];
    const b = quads[f * 4 + 1];
    const c = quads[f * 4 + 2];
    const d = quads[f * 4 + 3];
    tris.set([a, b, c, a, c, d], f * 6);
  }
  return tris;
}

/** Area-weighted vertex normals. */
export function computeNormals(positions: Float32Array, tris: ArrayLike<number>, out: Float32Array) {
  out.fill(0);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3;
    const b = tris[t + 1] * 3;
    const c = tris[t + 2] * 3;
    const abx = positions[b] - positions[a];
    const aby = positions[b + 1] - positions[a + 1];
    const abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a];
    const acy = positions[c + 1] - positions[a + 1];
    const acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    for (const i of [a, b, c]) {
      out[i] += nx;
      out[i + 1] += ny;
      out[i + 2] += nz;
    }
  }
  for (let i = 0; i < out.length; i += 3) {
    const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1;
    out[i] /= l;
    out[i + 1] /= l;
    out[i + 2] /= l;
  }
}
