/** Small, fast, seedable PRNG (mulberry32). Deterministic across browsers. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof mulberry32>;

/** Deterministic hash of an integer to [0, 1). */
export function hash01(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Smooth 3D value noise, enough for organic spatial variation. */
export function noise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const h = (i: number, j: number, k: number) =>
    hash01(i * 73856093 ^ j * 19349663 ^ k * 83492791 ^ seed * 2654435761);
  const u = s(xf);
  const v = s(yf);
  const w = s(zf);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    lerp(
      lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u),
      lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u),
      v,
    ),
    w,
  );
}
