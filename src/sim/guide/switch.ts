/**
 * What holds a knot: each theory's switch, drawn the same way for every theory (from guide.json's `switch`, computed by
 * the engine at the theory's typical setting). Along the bottom the theory's own drive, up the side how held; the band
 * where both states are stable, where a knot can hold; the stable branches solid (held in terracotta), the unstable
 * dashed; where rest and the holding stress put the typical knot.
 */
import { INKC } from './patch';

export type Switch = {
  x_label: string;
  y_label: string;
  x_max: number;
  /** A log axis from x_min (the latch's awareness, which attention raises many times over). */
  x_log?: boolean;
  x_min?: number;
  branches: { pts: [number, number][]; stable: boolean; held?: boolean }[];
  band: [number, number];
  marks: { x: number; label: string }[];
  note: string;
};

const MONO = 'font-family="SF Mono, Menlo, Monaco, monospace"';
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function switchChart(sw: Switch | undefined): string {
  if (!sw || !sw.branches) return '';
  const W = 360;
  const H = 190;
  const L = 34;
  const R = 12;
  const T = 18;
  const B = 34;
  const lo = sw.x_log ? (sw.x_min ?? sw.x_max / 100) : 0;
  const x = sw.x_log
    ? (v: number) => L + (Math.log(Math.min(Math.max(v, lo), sw.x_max) / lo) / Math.log(sw.x_max / lo)) * (W - L - R)
    : (v: number) => L + (Math.min(Math.max(v, 0), sw.x_max) / sw.x_max) * (W - L - R);
  const y = (v: number) => T + (1 - v) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="What holds a knot: its switch">`;
  const [b0, b1] = sw.band;
  if (b1 > b0 && b0 < sw.x_max) {
    s += `<rect x="${x(b0)}" y="${T}" width="${Math.max(x(Math.min(b1, sw.x_max)) - x(b0), 1)}" height="${H - T - B}" fill="${rgba(INKC.ivory, 0.07)}"/>`;
    s += `<text x="${(x(b0) + x(Math.min(b1, sw.x_max))) / 2}" y="${T - 5}" text-anchor="middle" ${MONO} font-size="7.5" fill="${INKC.stone}">both stable</text>`;
  }
  s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="${rgba(INKC.ivory, 0.25)}"/>`;
  s += `<line x1="${L}" x2="${L}" y1="${T}" y2="${y(0)}" stroke="${rgba(INKC.ivory, 0.25)}"/>`;
  s += `<text x="${L - 5}" y="${y(1) + 3}" text-anchor="end" ${MONO} font-size="7.5" fill="${INKC.knot}">${sw.y_label}</text>`;
  s += `<text x="${L - 5}" y="${y(0) + 3}" text-anchor="end" ${MONO} font-size="7.5" fill="${INKC.stone}">let go</text>`;
  for (const br of sw.branches) {
    if (!br.pts.length) continue;
    const d = br.pts.map(([px, py], i) => `${i ? 'L' : 'M'}${x(px).toFixed(1)} ${y(py).toFixed(1)}`).join(' ');
    const color = br.held ? INKC.knot : br.stable ? INKC.ivory : INKC.stone;
    s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${br.stable ? 1.8 : 1}" ${br.stable ? '' : 'stroke-dasharray="3 3"'} opacity="${br.stable ? 0.95 : 0.7}"/>`;
  }
  const marks = sw.marks.filter((m) => m.x <= sw.x_max).map((m) => ({ ...m, px: x(m.x) })).sort((a, b) => a.px - b.px);
  marks.forEach((m, i) => {
    s += `<line x1="${m.px}" x2="${m.px}" y1="${y(0)}" y2="${y(0) + 5}" stroke="${INKC.hand}" stroke-width="1.4"/>`;
    const near = (j: number) => j >= 0 && j < marks.length && Math.abs(marks[j].px - m.px) < 100;
    const anchor = near(i + 1) ? 'end' : near(i - 1) ? 'start' : 'middle';
    const dx = anchor === 'end' ? 3 : anchor === 'start' ? -3 : 0;
    s += `<text x="${m.px + dx}" y="${y(0) + 14}" text-anchor="${anchor}" ${MONO} font-size="7.5" fill="${INKC.hand}">${m.label}</text>`;
  });
  s += `<text x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle" ${MONO} font-size="7.5" fill="${INKC.stone}">${sw.x_label} →</text>`;
  return s + '</svg>';
}
