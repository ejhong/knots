import { buildMeshGraph, dijkstra, type MeshGraph } from '../lib/graph';
import { mulberry32, type Rng } from '../lib/random';

/**
 * The ladder of perforators.
 *
 * Every point on the skin is fed by a tree: a source vessel ("root") gives
 * off major perforators (≥0.5 mm — Taylor & Palmer counted ~374), which feed
 * medium ones, which feed the small perforators and ascending vessels of the
 * subdermal plexus, spaced millimetres apart — on the order of 100,000 in an
 * adult. This module samples that ladder on the body surface and connects it
 * into trees that run along the skin.
 */
export interface LadderParams {
  seed: number;
  /** Total perforators (all levels). */
  total: number;
  major: number;
  medium: number;
}

export const DEFAULT_LADDER: LadderParams = { seed: 7, total: 100_000, major: 374, medium: 3_600 };

export interface LadderInput {
  positions: Float32Array; // fine vertices, reference shape
  normals: Float32Array;
  triangles: Uint32Array;
  fineQuads: Uint32Array;
  /** Fine vertex of each root, in root order. */
  rootVertices: Int32Array;
  /** Relative density of major perforators at a point (1 = average). */
  majorDensity?: (x: number, y: number, z: number) => number;
}

export interface Ladder {
  count: number;
  tri: Uint32Array;
  uv: Float32Array;
  /** 0 small, 1 medium, 2 major. */
  level: Uint8Array;
  /** Parent perforator (small→medium/major, medium→major); -1 for majors. */
  parent: Int32Array;
  /** Root (territory) of each perforator. */
  root: Int16Array;
  /** Nearest fine vertex of each perforator. */
  vertex: Int32Array;
  /** Surface distance to the root along the tree (m). */
  depth: Float32Array;
  /** Tree edges as fine-vertex pairs (child → parent) with flow weights. */
  treeEdges: Int32Array;
  treeFlow: Float32Array;
  /** 2 = root→major trunk, 1 = major→medium branch. */
  treeLevel: Uint8Array;
  /** Territory (root index) of every fine vertex — the angiosomes. */
  territory: Int16Array;
  /** Predecessor toward the root, per fine vertex (trunk forest). */
  trunkPred: Int32Array;
  /** Surface distance to the nearest root / nearest major, per fine vertex. */
  trunkDist: Float32Array;
  branchDist: Float32Array;
  /** Predecessor toward the nearest major, per fine vertex (branch forest). */
  branchPred: Int32Array;
  branchLabel: Int32Array;
  /** Indices of major perforators (into the ladder). */
  majors: Int32Array;
  mediums: Int32Array;
}

interface Sample {
  tri: number;
  u: number;
  v: number;
  x: number;
  y: number;
  z: number;
}

function triangleAreas(pos: Float32Array, tris: Uint32Array) {
  const n = tris.length / 3;
  const areas = new Float64Array(n);
  let total = 0;
  for (let t = 0; t < n; t++) {
    const a = tris[t * 3] * 3;
    const b = tris[t * 3 + 1] * 3;
    const c = tris[t * 3 + 2] * 3;
    const abx = pos[b] - pos[a];
    const aby = pos[b + 1] - pos[a + 1];
    const abz = pos[b + 2] - pos[a + 2];
    const acx = pos[c] - pos[a];
    const acy = pos[c + 1] - pos[a + 1];
    const acz = pos[c + 2] - pos[a + 2];
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    const ar = 0.5 * Math.hypot(cx, cy, cz);
    areas[t] = ar;
    total += ar;
  }
  return { areas, total };
}

function sampleSurface(pos: Float32Array, tris: Uint32Array, count: number, rng: Rng): Sample[] {
  const { areas, total } = triangleAreas(pos, tris);
  const cdf = new Float64Array(areas.length);
  let acc = 0;
  for (let i = 0; i < areas.length; i++) {
    acc += areas[i] / total;
    cdf[i] = acc;
  }
  const out: Sample[] = [];
  for (let s = 0; s < count; s++) {
    const r = rng();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const t = lo;
    const r1 = Math.sqrt(rng());
    const r2 = rng();
    const u = r1 * (1 - r2);
    const v = r1 * r2;
    const w = 1 - u - v;
    const a = tris[t * 3] * 3;
    const b = tris[t * 3 + 1] * 3;
    const c = tris[t * 3 + 2] * 3;
    out.push({
      tri: t,
      u,
      v,
      x: pos[a] * w + pos[b] * u + pos[c] * v,
      y: pos[a + 1] * w + pos[b + 1] * u + pos[c + 1] * v,
      z: pos[a + 2] * w + pos[b + 2] * u + pos[c + 2] * v,
    });
  }
  return out;
}

/** Spatial hash for Poisson-disk rejection in 3D. */
class Grid {
  private cells = new Map<number, number[]>();
  constructor(private size: number) {}
  private key(x: number, y: number, z: number) {
    const s = this.size;
    return (Math.floor(x / s) + 512) * 1048576 + (Math.floor(y / s) + 512) * 1024 + (Math.floor(z / s) + 512);
  }
  add(i: number, x: number, y: number, z: number) {
    const k = this.key(x, y, z);
    let c = this.cells.get(k);
    if (!c) this.cells.set(k, (c = []));
    c.push(i);
  }
  /** Calls fn for indices in the 27 cells around (x, y, z); stops if fn returns true. */
  any(x: number, y: number, z: number, fn: (i: number) => boolean): boolean {
    const s = this.size;
    const cx = Math.floor(x / s);
    const cy = Math.floor(y / s);
    const cz = Math.floor(z / s);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const c = this.cells.get((cx + dx + 512) * 1048576 + (cy + dy + 512) * 1024 + (cz + dz + 512));
          if (c) for (const i of c) if (fn(i)) return true;
        }
    return false;
  }
}

function poisson(samples: Sample[], radius: (s: Sample) => number, maxR: number, preset: Sample[] = []) {
  const grid = new Grid(maxR);
  const accepted: Sample[] = [];
  const all: Sample[] = [];
  const radii: number[] = [];
  for (const p of preset) {
    grid.add(all.length, p.x, p.y, p.z);
    radii.push(radius(p));
    all.push(p);
  }
  for (const s of samples) {
    const r = radius(s);
    const blocked = grid.any(s.x, s.y, s.z, (i) => {
      const o = all[i];
      const rr = Math.min(r, radii[i]);
      const dx = o.x - s.x;
      const dy = o.y - s.y;
      const dz = o.z - s.z;
      return dx * dx + dy * dy + dz * dz < rr * rr;
    });
    if (blocked) continue;
    grid.add(all.length, s.x, s.y, s.z);
    radii.push(r);
    all.push(s);
    accepted.push(s);
  }
  return accepted;
}

/** Finds a Poisson radius scale that yields roughly `target` points. */
function poissonTarget(
  samples: Sample[],
  target: number,
  shape: (s: Sample) => number,
  r0: number,
  preset: Sample[] = [],
) {
  let scale = r0;
  let best: Sample[] = [];
  for (let iter = 0; iter < 8; iter++) {
    const maxShape = 2.5;
    const res = poisson(samples, (s) => scale * shape(s), scale * maxShape, preset);
    best = res;
    const ratio = res.length / target;
    // Aim slightly over, then trim to the exact count (the samples are
    // already in random order, so trimming removes a random subset).
    if (ratio >= 1 && ratio < 1.04) break;
    scale *= Math.pow(ratio / 1.015, 0.5);
  }
  return best.length > target ? best.slice(0, target) : best;
}

function nearestVertex(tris: Uint32Array, s: { tri: number; u: number; v: number }) {
  const w = 1 - s.u - s.v;
  const t = s.tri * 3;
  if (w >= s.u && w >= s.v) return tris[t];
  return s.u >= s.v ? tris[t + 1] : tris[t + 2];
}

export function buildLadder(input: LadderInput, params: LadderParams = DEFAULT_LADDER): Ladder {
  const rng = mulberry32(params.seed);
  const { positions, triangles } = input;
  const { total: area } = triangleAreas(positions, triangles);

  // 1. Small perforators: blue noise over the whole skin.
  const candidates = sampleSurface(positions, triangles, Math.round(params.total * 2.6), rng);
  const r0 = Math.sqrt(area / params.total) * 0.9;
  const all = poissonTarget(candidates, params.total, () => 1, r0);

  // 2. Majors and mediums: coarser blue noise within the same set, denser
  //    where surgeons find perforators clustered.
  const density = input.majorDensity ?? (() => 1);
  const shuffled = all.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const shape = (s: Sample) => 1 / Math.sqrt(Math.max(0.25, density(s.x, s.y, s.z)));
  const majors = poissonTarget(shuffled, params.major, shape, Math.sqrt(area / params.major) * 0.85);
  const majorSet = new Set(majors);
  const mediums = poissonTarget(
    shuffled.filter((s) => !majorSet.has(s)),
    params.medium,
    shape,
    Math.sqrt(area / params.medium) * 0.85,
    majors,
  );
  const mediumSet = new Set(mediums);

  // Order: majors, mediums, smalls — so levels are contiguous ranges.
  const smalls = all.filter((s) => !majorSet.has(s) && !mediumSet.has(s));
  const ordered = [...majors, ...mediums, ...smalls];
  const N = ordered.length;
  const tri = new Uint32Array(N);
  const uv = new Float32Array(N * 2);
  const level = new Uint8Array(N);
  const vertex = new Int32Array(N);
  ordered.forEach((s, i) => {
    tri[i] = s.tri;
    uv[i * 2] = s.u;
    uv[i * 2 + 1] = s.v;
    level[i] = i < majors.length ? 2 : i < majors.length + mediums.length ? 1 : 0;
    vertex[i] = nearestVertex(triangles, s);
  });
  const nMaj = majors.length;
  const nMed = mediums.length;

  // 3. Trees along the skin. Quad diagonals make the graph 8-connected so
  //    the branches run straighter.
  const graph: MeshGraph = buildMeshGraph(positions, withDiagonals(triangles, input.fineQuads));

  const trunks = dijkstra(graph, input.rootVertices);
  const majorVerts = vertex.subarray(0, nMaj);
  const branches = dijkstra(graph, majorVerts);
  const twigs = dijkstra(graph, vertex.subarray(0, nMaj + nMed));

  const parent = new Int32Array(N).fill(-1);
  const root = new Int16Array(N);
  const depth = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const v = vertex[i];
    root[i] = trunks.label[v];
    if (i < nMaj) {
      parent[i] = -1;
      depth[i] = trunks.dist[v];
    } else if (i < nMaj + nMed) {
      parent[i] = branches.label[v];
      depth[i] = branches.dist[v] + trunks.dist[vertex[parent[i]]];
    } else {
      parent[i] = twigs.label[v];
      depth[i] = twigs.dist[v] + (depth[parent[i]] || 0);
    }
  }
  // Mediums' depth needs their major; smalls' depth may reference mediums
  // computed above (parents always precede children in this ordering).

  // 4. Unique tree edges with flow (how many perforators drain through each).
  const edgeFlow = new Map<number, { a: number; b: number; flow: number; lvl: number }>();
  const V = graph.vertexCount;
  const addPath = (start: number, pred: Int32Array, lvl: number, weight: number) => {
    let v = start;
    let guard = 0;
    while (pred[v] >= 0 && guard++ < 5000) {
      const p = pred[v];
      const key = v * V + p;
      const e = edgeFlow.get(key);
      if (e) {
        e.flow += weight;
        e.lvl = Math.max(e.lvl, lvl);
      } else edgeFlow.set(key, { a: v, b: p, flow: weight, lvl });
      v = p;
    }
  };
  for (let i = 0; i < nMaj; i++) addPath(vertex[i], trunks.pred, 2, 1 + countChildren(i));
  for (let i = nMaj; i < nMaj + nMed; i++) addPath(vertex[i], branches.pred, 1, 1);

  function countChildren(majorIndex: number) {
    // Approximate: mediums are ~10× majors; weight majors so trunks read thicker.
    return (nMed / Math.max(1, nMaj)) * (0.6 + 0.8 * (majorIndex % 7) / 7);
  }

  const E = edgeFlow.size;
  const treeEdges = new Int32Array(E * 2);
  const treeFlow = new Float32Array(E);
  const treeLevel = new Uint8Array(E);
  let k = 0;
  for (const e of edgeFlow.values()) {
    treeEdges[k * 2] = e.a;
    treeEdges[k * 2 + 1] = e.b;
    treeFlow[k] = e.flow;
    treeLevel[k] = e.lvl;
    k++;
  }

  const territory = Int16Array.from(trunks.label);
  const majorsIdx = Int32Array.from({ length: nMaj }, (_, i) => i);
  const mediumsIdx = Int32Array.from({ length: nMed }, (_, i) => nMaj + i);

  return {
    count: N,
    tri,
    uv,
    level,
    parent,
    root,
    vertex,
    depth,
    treeEdges,
    treeFlow,
    treeLevel,
    territory,
    trunkPred: trunks.pred,
    trunkDist: trunks.dist,
    branchDist: branches.dist,
    branchPred: branches.pred,
    branchLabel: branches.label,
    majors: majorsIdx,
    mediums: mediumsIdx,
  };
}

export function withDiagonals(triangles: Uint32Array, quads: Uint32Array): Uint32Array {
  // Add the second diagonal of every quad as a degenerate triangle pair so
  // buildMeshGraph picks up the extra edge.
  const extra = new Uint32Array((quads.length / 4) * 3);
  for (let q = 0; q < quads.length / 4; q++) {
    const b = quads[q * 4 + 1];
    const d = quads[q * 4 + 3];
    extra[q * 3] = b;
    extra[q * 3 + 1] = d;
    extra[q * 3 + 2] = b;
  }
  const out = new Uint32Array(triangles.length + extra.length);
  out.set(triangles);
  out.set(extra, triangles.length);
  return out;
}
