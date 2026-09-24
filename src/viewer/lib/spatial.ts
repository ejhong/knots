/**
 * Uniform grid over a point set (counting sort into cells). Rebuilt when
 * the figure changes shape; answers radius queries in microseconds.
 */
export class PointGrid {
  private cellStart!: Int32Array;
  private items!: Int32Array;
  private min = [0, 0, 0];
  private dims = [1, 1, 1];

  constructor(
    private positions: Float32Array,
    private cell = 0.012,
  ) {
    this.rebuild();
  }

  rebuild(positions?: Float32Array) {
    if (positions) this.positions = positions;
    const P = this.positions;
    const n = P.length / 3;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 3; k++) {
        const v = P[i * 3 + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    this.min = min;
    this.dims = [0, 1, 2].map((k) => Math.max(1, Math.ceil((max[k] - min[k]) / this.cell) + 1));
    const total = this.dims[0] * this.dims[1] * this.dims[2];
    const counts = new Int32Array(total + 1);
    const cellOf = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const c = this.cellIndex(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      cellOf[i] = c;
      counts[c + 1]++;
    }
    for (let c = 0; c < total; c++) counts[c + 1] += counts[c];
    const fill = counts.slice(0, total);
    const items = new Int32Array(n);
    for (let i = 0; i < n; i++) items[fill[cellOf[i]]++] = i;
    this.cellStart = counts;
    this.items = items;
  }

  private cellIndex(x: number, y: number, z: number) {
    const cx = Math.min(this.dims[0] - 1, Math.max(0, Math.floor((x - this.min[0]) / this.cell)));
    const cy = Math.min(this.dims[1] - 1, Math.max(0, Math.floor((y - this.min[1]) / this.cell)));
    const cz = Math.min(this.dims[2] - 1, Math.max(0, Math.floor((z - this.min[2]) / this.cell)));
    return (cz * this.dims[1] + cy) * this.dims[0] + cx;
  }

  /** Calls fn(index, distance) for every point within radius r of (x, y, z). */
  query(x: number, y: number, z: number, r: number, fn: (i: number, d: number) => void) {
    const P = this.positions;
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r - this.min[0]) / c));
    const x1 = Math.min(this.dims[0] - 1, Math.floor((x + r - this.min[0]) / c));
    const y0 = Math.max(0, Math.floor((y - r - this.min[1]) / c));
    const y1 = Math.min(this.dims[1] - 1, Math.floor((y + r - this.min[1]) / c));
    const z0 = Math.max(0, Math.floor((z - r - this.min[2]) / c));
    const z1 = Math.min(this.dims[2] - 1, Math.floor((z + r - this.min[2]) / c));
    const r2 = r * r;
    for (let cz = z0; cz <= z1; cz++)
      for (let cy = y0; cy <= y1; cy++)
        for (let cx = x0; cx <= x1; cx++) {
          const cell = (cz * this.dims[1] + cy) * this.dims[0] + cx;
          for (let j = this.cellStart[cell]; j < this.cellStart[cell + 1]; j++) {
            const i = this.items[j];
            const dx = P[i * 3] - x;
            const dy = P[i * 3 + 1] - y;
            const dz = P[i * 3 + 2] - z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 <= r2) fn(i, Math.sqrt(d2));
          }
        }
  }

  nearest(x: number, y: number, z: number, r: number, filter?: (i: number) => boolean): number {
    let best = -1;
    let bestD = Infinity;
    this.query(x, y, z, r, (i, d) => {
      if (d < bestD && (!filter || filter(i))) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
}
