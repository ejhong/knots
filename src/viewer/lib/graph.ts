/**
 * Surface graph utilities: vertex adjacency (CSR) from triangles, and
 * multi-source Dijkstra, which gives nearest-source labels (territories),
 * distances, and predecessor trees (paths that run along the skin).
 */
export interface MeshGraph {
  vertexCount: number;
  rowPtr: Int32Array;
  cols: Int32Array;
  lengths: Float32Array;
}

export function buildMeshGraph(positions: Float32Array, triangles: ArrayLike<number>): MeshGraph {
  const V = positions.length / 3;
  const seen = new Set<number>();
  const pairs: number[] = [];
  const addEdge = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? a * V + b : b * V + a;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(a, b);
  };
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t];
    const b = triangles[t + 1];
    const c = triangles[t + 2];
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }
  const degree = new Int32Array(V);
  for (let i = 0; i < pairs.length; i += 2) {
    degree[pairs[i]]++;
    degree[pairs[i + 1]]++;
  }
  const rowPtr = new Int32Array(V + 1);
  for (let v = 0; v < V; v++) rowPtr[v + 1] = rowPtr[v] + degree[v];
  const fill = rowPtr.slice(0, V);
  const cols = new Int32Array(rowPtr[V]);
  const lengths = new Float32Array(rowPtr[V]);
  for (let i = 0; i < pairs.length; i += 2) {
    const a = pairs[i];
    const b = pairs[i + 1];
    const d = Math.hypot(
      positions[a * 3] - positions[b * 3],
      positions[a * 3 + 1] - positions[b * 3 + 1],
      positions[a * 3 + 2] - positions[b * 3 + 2],
    );
    cols[fill[a]] = b;
    lengths[fill[a]++] = d;
    cols[fill[b]] = a;
    lengths[fill[b]++] = d;
  }
  return { vertexCount: V, rowPtr, cols, lengths };
}

/** Binary min-heap keyed by float priority. */
class Heap {
  private keys: Float64Array;
  private vals: Int32Array;
  size = 0;
  constructor(cap: number) {
    this.keys = new Float64Array(cap);
    this.vals = new Int32Array(cap);
  }
  push(k: number, v: number) {
    if (this.size === this.keys.length) {
      const nk = new Float64Array(this.keys.length * 2);
      nk.set(this.keys);
      const nv = new Int32Array(this.vals.length * 2);
      nv.set(this.vals);
      this.keys = nk;
      this.vals = nv;
    }
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= k) break;
      this.keys[i] = this.keys[p];
      this.vals[i] = this.vals[p];
      i = p;
    }
    this.keys[i] = k;
    this.vals[i] = v;
  }
  /** Pops the minimum; returns the value, and the key via `lastKey`. */
  lastKey = 0;
  pop(): number {
    const top = this.vals[0];
    this.lastKey = this.keys[0];
    const k = this.keys[--this.size];
    const v = this.vals[this.size];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= this.size) break;
      if (c + 1 < this.size && this.keys[c + 1] < this.keys[c]) c++;
      if (this.keys[c] >= k) break;
      this.keys[i] = this.keys[c];
      this.vals[i] = this.vals[c];
      i = c;
    }
    this.keys[i] = k;
    this.vals[i] = v;
    return top;
  }
}

export interface DijkstraResult {
  dist: Float32Array;
  /** Index into `sources` of the nearest source, or -1. */
  label: Int32Array;
  /** Predecessor vertex on the shortest path, -1 at sources. */
  pred: Int32Array;
}

/**
 * Multi-source Dijkstra. `weight(v)` optionally scales edge costs entering
 * `v`, which lets trees prefer some regions (e.g. follow the midline).
 */
export function dijkstra(
  g: MeshGraph,
  sources: ArrayLike<number>,
  opts: { maxDist?: number; weight?: Float32Array } = {},
): DijkstraResult {
  const V = g.vertexCount;
  const dist = new Float32Array(V).fill(Infinity);
  const label = new Int32Array(V).fill(-1);
  const pred = new Int32Array(V).fill(-1);
  const heap = new Heap(Math.max(1024, sources.length * 4));
  for (let s = 0; s < sources.length; s++) {
    const v = sources[s];
    if (v < 0) continue;
    if (dist[v] === 0) continue;
    dist[v] = 0;
    label[v] = s;
    heap.push(0, v);
  }
  const maxDist = opts.maxDist ?? Infinity;
  const w = opts.weight;
  while (heap.size > 0) {
    const v = heap.pop();
    const d = heap.lastKey;
    if (d > dist[v]) continue;
    if (d > maxDist) break;
    for (let j = g.rowPtr[v]; j < g.rowPtr[v + 1]; j++) {
      const u = g.cols[j];
      const nd = d + g.lengths[j] * (w ? w[u] : 1);
      if (nd < dist[u]) {
        dist[u] = nd;
        label[u] = label[v];
        pred[u] = v;
        heap.push(nd, u);
      }
    }
  }
  return { dist, label, pred };
}

/** Walks predecessors from `v` back to its source. */
export function tracePath(pred: Int32Array, v: number, maxLen = 4096): number[] {
  const path: number[] = [];
  let cur = v;
  while (cur >= 0 && path.length < maxLen) {
    path.push(cur);
    cur = pred[cur];
  }
  return path;
}
