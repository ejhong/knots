/**
 * A procedural ensō (円相): one breath of the brush. The stroke starts
 * pressed and full, swells, then dries and tapers into a gap. Deterministic
 * for a seed, so the mark is stable across builds.
 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface EnsoOptions {
  size?: number;
  weight?: number;
  seed?: number;
  /** Sweep in degrees (the rest is the gap). */
  sweep?: number;
  start?: number;
}

export function ensoPath({ size = 100, weight = 0.085, seed = 3, sweep = 322, start = -62 }: EnsoOptions = {}): string {
  const r = rng(seed);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.4;
  const steps = 180;
  const wobble = [r() * 6, r() * 6, r() * 6];
  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = ((start + sweep * t) * Math.PI) / 180;
    const rad =
      R *
      (1 +
        0.018 * Math.sin(a * 2 + wobble[0]) +
        0.012 * Math.sin(a * 3 + wobble[1]) +
        0.006 * Math.sin(a * 7 + wobble[2]) -
        0.03 * t * t);
    // Brush pressure: a firm attack, a full body, a dry, tapering tail.
    const attack = Math.min(1, t / 0.035);
    const body = 0.82 + 0.18 * Math.sin(Math.PI * Math.min(1, t * 1.4));
    const tail = t > 0.62 ? Math.pow(1 - (t - 0.62) / 0.38, 1.35) : 1;
    const dry = t > 0.7 ? 1 - 0.18 * r() * ((t - 0.7) / 0.3) : 1;
    const w = size * weight * attack * body * Math.max(0.03, tail) * dry;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    outer.push([px + nx * w * 0.55, py + ny * w * 0.55]);
    inner.push([px - nx * w * 0.45, py - ny * w * 0.45]);
  }
  const f = (p: [number, number]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const pts = [...outer, ...inner.reverse()];
  return `M${f(pts[0])}` + pts.slice(1).map((p) => `L${f(p)}`).join('') + 'Z';
}
