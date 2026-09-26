/**
 * Figures for the simulation page, as SVG strings (like lib/crossSection.ts): drawn at build time from the same model
 * the browser runs, then animated in place by ./bench.ts through their ids.
 *
 * Colours follow docs/DESIGN.md: terracotta is the knot (the shut vessel) and nothing else; jade is release (the open
 * branch, the spark); vessels are moonlit silver-blue; the hand's controls are bronze. On ink, knot #e27b61 against
 * spark #a8e6cd; on paper, #c4452f against #3f8f73 (the pair that stays distinct under colour-blindness).
 */
import { curve, type Params, type SwitchInfo } from './vessel';

export const INK = {
  bg: '#23282b',
  text: '#e5e3dc',
  muted: '#b7c1bd',
  faint: '#7f8b89',
  line: '#384043',
  knot: '#e27b61',
  spark: '#a8e6cd',
  vessel: '#b3c4d2',
  ivory: '#e6dccd',
  ochre: '#c9a45f',
};
export const PAPER = { text: '#3a3632', muted: '#8a7d6d', faint: '#b3a899', line: '#e0dbd4', knot: '#c4452f', release: '#3f8f73', ink: '#6b5d4d' };

const MONO = "font-family=\"SF Mono, Menlo, Monaco, monospace\"";
const SERIF = "font-family=\"Georgia, serif\"";
const f1 = (n: number) => n.toFixed(1);

// ---------- The switch: the balance of forces as a diagram ----------

export const SW = { W: 360, H: 236, left: 42, right: 344, top: 18, bottom: 196, Amax: 0.65, xmax: 1.0 };
export const swX = (A: number) => SW.left + (Math.min(Math.max(A, 0), SW.Amax) / SW.Amax) * (SW.right - SW.left);
export const swY = (x: number) => SW.bottom - (Math.min(Math.max(x, 0), SW.xmax) / SW.xmax) * (SW.bottom - SW.top);

export function switchDiagram(p: Params, s: SwitchInfo): string {
  const c = curve(p, 500);
  const pts = c.x.map((x, i) => [c.A[i], x] as const).filter(([A, x]) => A >= 0 && x <= s.xp + 1e-9);
  const open = pts.filter(([, x]) => x >= s.xfold);
  const edge = pts.filter(([, x]) => x <= s.xfold);
  const path = (q: readonly (readonly [number, number])[]) => q.map(([A, x], i) => `${i ? 'L' : 'M'}${f1(swX(A))} ${f1(swY(x))}`).join(' ');
  const out: string[] = [];
  // Band where open and shut are both stable.
  out.push(`<rect x="${f1(swX(s.Aopen))}" y="${SW.top}" width="${f1(swX(s.Afold) - swX(s.Aopen))}" height="${SW.bottom - SW.top}" fill="#ffffff" opacity="0.045"/>`);
  out.push(`<text x="${f1((swX(s.Aopen) + swX(s.Afold)) / 2)}" y="${SW.top + 10}" text-anchor="middle" fill="${INK.faint}" font-size="8" ${MONO}>both stable</text>`);
  // Axes: hairlines.
  out.push(`<line x1="${SW.left}" x2="${SW.right}" y1="${SW.bottom}" y2="${SW.bottom}" stroke="${INK.line}" stroke-width="1"/>`);
  out.push(`<line x1="${SW.left}" x2="${SW.left}" y1="${SW.top}" y2="${SW.bottom}" stroke="${INK.line}" stroke-width="1"/>`);
  for (const A of [0, 0.2, 0.4, 0.6]) {
    out.push(`<text x="${f1(swX(A))}" y="${SW.bottom + 12}" text-anchor="middle" fill="${INK.faint}" font-size="8" ${MONO}>${A.toFixed(1)}</text>`);
  }
  for (const x of [0, 0.5, 1]) {
    out.push(`<text x="${SW.left - 6}" y="${f1(swY(x) + 3)}" text-anchor="end" fill="${INK.faint}" font-size="8" ${MONO}>${x}</text>`);
  }
  out.push(`<text x="${SW.right}" y="${SW.bottom + 26}" text-anchor="end" fill="${INK.muted}" font-size="8.5" ${MONO}>tone of the wall's muscle →</text>`);
  out.push(`<text x="${SW.left + 4}" y="${SW.top - 6}" fill="${INK.muted}" font-size="8.5" ${MONO}>↑ radius</text>`);
  // Resting tone.
  out.push(`<line x1="${f1(swX(s.urest))}" x2="${f1(swX(s.urest))}" y1="${SW.bottom}" y2="${SW.bottom - 5}" stroke="${INK.muted}" stroke-width="1"/>`);
  out.push(`<text x="${f1(swX(s.urest))}" y="${SW.bottom - 8}" text-anchor="middle" fill="${INK.faint}" font-size="7.5" ${MONO}>rest</text>`);
  // Branches: open (jade), the edge between (dashed), shut (terracotta).
  out.push(`<path d="${path(open)}" fill="none" stroke="${INK.spark}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
  out.push(`<path d="${path(edge)}" fill="none" stroke="${INK.faint}" stroke-width="1.4" stroke-dasharray="3 3"/>`);
  out.push(`<line x1="${f1(swX(s.Aopen))}" x2="${f1(swX(SW.Amax))}" y1="${f1(swY(p.xc))}" y2="${f1(swY(p.xc))}" stroke="${INK.knot}" stroke-width="2.4" stroke-linecap="round"/>`);
  // The snaps: shut at the fold, open at the floor's end.
  const fx = swX(s.Afold);
  out.push(`<path d="M${f1(fx + 7)} ${f1(swY(s.xfold) + 2)} L${f1(fx + 7)} ${f1(swY(p.xc) - 9)}" stroke="${INK.knot}" stroke-width="1" opacity="0.8"/><path d="M${f1(fx + 4)} ${f1(swY(p.xc) - 13)} L${f1(fx + 7)} ${f1(swY(p.xc) - 8)} L${f1(fx + 10)} ${f1(swY(p.xc) - 13)}" fill="none" stroke="${INK.knot}" stroke-width="1"/>`);
  out.push(`<text x="${f1(fx + 12)}" y="${f1((swY(s.xfold) + swY(p.xc)) / 2)}" fill="${INK.muted}" font-size="8" ${MONO}>shuts</text>`);
  const ox = swX(s.Aopen);
  const xOpenAt = open.length ? open.reduce((a, b) => (Math.abs(b[0] - s.Aopen) < Math.abs(a[0] - s.Aopen) ? b : a))[1] : s.xrest;
  out.push(`<path d="M${f1(ox - 7)} ${f1(swY(p.xc) - 4)} L${f1(ox - 7)} ${f1(swY(xOpenAt) + 8)}" stroke="${INK.spark}" stroke-width="1" opacity="0.8"/><path d="M${f1(ox - 10)} ${f1(swY(xOpenAt) + 12)} L${f1(ox - 7)} ${f1(swY(xOpenAt) + 7)} L${f1(ox - 4)} ${f1(swY(xOpenAt) + 12)}" fill="none" stroke="${INK.spark}" stroke-width="1"/>`);
  out.push(`<text x="${f1(ox - 12)}" y="${f1((swY(p.xc) + swY(xOpenAt)) / 2 + 14)}" text-anchor="end" fill="${INK.muted}" font-size="8" ${MONO}>reopens</text>`);
  // Direct labels.
  const lab = open[Math.floor(open.length * 0.55)] ?? open[0];
  out.push(`<text x="${f1(swX(lab[0]) + 8)}" y="${f1(swY(lab[1]) - 6)}" fill="${INK.text}" font-size="9" ${MONO}>open</text>`);
  out.push(`<text x="${f1(swX(0.5))}" y="${f1(swY(p.xc) - 7)}" fill="${INK.text}" font-size="9" ${MONO}>shut: a knot</text>`);
  const e = edge[Math.floor(edge.length * 0.45)] ?? edge[0];
  if (e) out.push(`<text x="${f1(swX(e[0]) - 6)}" y="${f1(swY(e[1]))}" text-anchor="end" fill="${INK.faint}" font-size="7.5" ${MONO}>the edge</text>`);
  // Live layer: where tone is heading, the state now, and a hover readout.
  out.push(`<path id="sw-cmd" d="M0 0 l-4 7 h8 z" fill="${INK.ochre}" transform="translate(${f1(swX(s.urest))} ${SW.bottom + 1})"/>`);
  out.push(`<circle id="sw-dot" cx="${f1(swX(s.urest))}" cy="${f1(swY(s.xrest))}" r="5" fill="${INK.spark}" stroke="${INK.bg}" stroke-width="2"/>`);
  out.push(`<line id="sw-hover" x1="0" x2="0" y1="${SW.top}" y2="${SW.bottom}" stroke="${INK.muted}" stroke-width="1" opacity="0" pointer-events="none"/>`);
  out.push(`<text id="sw-hover-text" x="0" y="${SW.top + 22}" fill="${INK.text}" font-size="8.5" ${MONO} opacity="0" pointer-events="none"></text>`);
  out.push(`<rect id="sw-hit" x="${SW.left}" y="${SW.top}" width="${SW.right - SW.left}" height="${SW.bottom - SW.top}" fill="transparent"/>`);
  return `<svg class="sw" viewBox="0 0 ${SW.W} ${SW.H}" role="img" aria-labelledby="sw-title sw-desc"><title id="sw-title">The switch</title><desc id="sw-desc">Radius of a small artery against the tone of its muscle. The open branch falls as tone rises until a fold at tone ${s.Afold.toFixed(2)}, where the vessel snaps shut. A shut vessel stays shut until tone falls below ${s.Aopen.toFixed(2)}. Between the two, both states are stable. Resting tone is ${s.urest.toFixed(2)}.</desc>${out.join('')}</svg>`;
}

// ---------- The knot in section ----------

export const CS = { W: 360, H: 262, vx: 150, skin: 16, fat: 30, sup: 142, deep: 190, bottom: 250, scale: 13 };

export function sectionDrawing(): string {
  const { W, H, vx, skin, fat, sup, deep, bottom } = CS;
  const o: string[] = [];
  o.push(`<rect x="0" y="${skin}" width="${W - 92}" height="${fat - skin}" fill="#6d5f55"/>`);
  o.push(`<rect id="cs-warm" x="0" y="${skin}" width="${W - 92}" height="${fat - skin}" fill="${INK.ochre}" opacity="0"/>`);
  o.push(`<rect x="0" y="${fat}" width="${W - 92}" height="${sup - fat}" fill="#4a4338" opacity="0.85"/>`);
  for (let i = 0; i < 11; i++) {
    const cx = 12 + i * 22 + (i % 2) * 6;
    const cy = fat + 28 + (i % 3) * 30;
    o.push(`<ellipse cx="${cx}" cy="${cy}" rx="10" ry="8" fill="none" stroke="${INK.faint}" stroke-width="0.5" opacity="0.45"/>`);
  }
  o.push(`<rect x="0" y="${sup}" width="${W - 92}" height="${deep - sup}" fill="#39353a"/>`);
  o.push(`<rect x="0" y="${deep}" width="${W - 92}" height="${bottom - deep}" fill="#5a3a33" opacity="0.9"/>`);
  for (let i = 0; i < 3; i++) o.push(`<line x1="0" x2="${W - 92}" y1="${deep + 16 + i * 14}" y2="${deep + 16 + i * 14}" stroke="#6e4a41" stroke-width="0.6" stroke-dasharray="6 3"/>`);
  o.push(`<line x1="0" x2="${W - 92}" y1="${sup}" y2="${sup}" stroke="#e6ded2" stroke-width="1.3" opacity="0.8"/>`);
  o.push(`<line x1="0" x2="${W - 92}" y1="${deep}" y2="${deep}" stroke="#efe7da" stroke-width="1.8" opacity="0.9"/>`);
  // The perforator: lumen, the muscle of its wall, the blood.
  o.push(`<rect id="cs-lumen" x="${vx - 9}" y="${fat - 6}" width="18" height="${bottom - fat + 6}" fill="${INK.vessel}" opacity="0.16"/>`);
  o.push(`<rect id="cs-wall-l" x="${vx - 13}" y="${fat - 6}" width="4" height="${bottom - fat + 6}" fill="${INK.vessel}" opacity="0.5"/>`);
  o.push(`<rect id="cs-wall-r" x="${vx + 9}" y="${fat - 6}" width="4" height="${bottom - fat + 6}" fill="${INK.vessel}" opacity="0.5"/>`);
  for (let i = 0; i < 12; i++) o.push(`<circle class="cs-blood" cx="${vx}" cy="${bottom - i * 18}" r="1.6" fill="${INK.ivory}" opacity="0.8"/>`);
  // Branches into the skin.
  for (const dx of [-26, 22, 40]) o.push(`<path d="M${vx} ${fat + 4} Q ${vx + dx * 0.4} ${fat - 2} ${vx + dx} ${skin + 4}" fill="none" stroke="${INK.vessel}" stroke-width="0.8" opacity="0.55"/>`);
  // The ring in the deep fascia where it passes, and the knot's mark.
  o.push(`<rect x="${vx - 24}" y="${deep - 2}" width="8" height="4" rx="1" fill="#efe7da"/><rect x="${vx + 16}" y="${deep - 2}" width="8" height="4" rx="1" fill="#efe7da"/>`);
  o.push(`<circle id="cs-knot-glow" cx="${vx}" cy="${deep}" r="10" fill="${INK.knot}" opacity="0"/>`);
  o.push(`<circle id="cs-knot" cx="${vx}" cy="${deep}" r="5" fill="${INK.knot}" opacity="0"/>`);
  // The nerve that travels with it, and its spark.
  const nerve = `M${vx + 22} ${bottom} L${vx + 22} ${deep} L${vx + 26} ${sup} L${vx + 34} ${skin + 6}`;
  o.push(`<path d="${nerve}" fill="none" stroke="#d9c77a" stroke-width="1" opacity="0.4"/>`);
  o.push(`<path id="cs-spark" d="${nerve}" fill="none" stroke="${INK.spark}" stroke-width="1.8" opacity="0"/>`);
  for (let i = 0; i < 6; i++) o.push(`<circle class="cs-star" cx="${vx + 18 + i * 9}" cy="${skin + 3 + (i % 2) * 4}" r="${1.4 + (i % 3) * 0.5}" fill="${INK.spark}" opacity="0"/>`);
  // Labels.
  const L = (y: number, t: string, sub = '') =>
    o.push(`<text x="${W - 86}" y="${y + 3}" fill="#cdd1cc" font-size="8.5" ${MONO}>${t}</text>` + (sub ? `<text x="${W - 86}" y="${y + 13}" fill="${INK.faint}" font-size="7.5" ${MONO}>${sub}</text>` : ''));
  L(skin + 7, 'skin');
  L((fat + sup) / 2, 'fat');
  L(sup, 'superficial', 'fascia');
  L(deep, 'deep fascia');
  L((deep + bottom) / 2 + 8, 'muscle');
  o.push(`<text x="${vx - 34}" y="${bottom - 6}" text-anchor="end" fill="${INK.faint}" font-size="8" ${MONO}>perforator</text>`);
  o.push(`<text x="${vx + 30}" y="${bottom - 6}" fill="${INK.faint}" font-size="8" ${MONO}>nerve</text>`);
  o.push(`<text id="cs-state" x="${vx - 30}" y="${deep - 8}" text-anchor="end" fill="${INK.text}" font-size="9" ${MONO}>open</text>`);
  o.push(`<text x="4" y="${H - 2}" fill="${INK.faint}" font-size="7.5" ${SERIF} font-style="italic">the vessel is drawn about ten times wider than its true 0.24 mm</text>`);
  return `<svg class="cs" viewBox="0 0 ${W} ${H}" role="img" aria-label="A perforator in section: skin, fat, the superficial and deep fascia, and muscle; the small artery rising through a ring in the deep fascia, with its nerve beside it. The live model narrows the vessel with tone, shuts it into a knot, and lights the nerve when blood returns.">${o.join('')}</svg>`;
}

// ---------- Live traces: small multiples, one quantity per strip ----------

export const TRACES = [
  { key: 'tone', label: 'tone', color: INK.text, max: 0.65, fmt: (v: number) => v.toFixed(2) },
  { key: 'flow', label: 'flow', color: INK.vessel, max: 2.5, fmt: (v: number) => `${v.toFixed(2)}×` },
  { key: 'debt', label: 'debt', color: INK.ochre, max: 1, fmt: (v: number) => v.toFixed(2) },
  { key: 'spark', label: 'spark', color: INK.spark, max: 1, fmt: (v: number) => v.toFixed(2) },
] as const;

/** Geometry of the traces at a given drawing width (the page redraws them at the width they are shown, so text
 *  stays its true size on a phone). */
export const traceBox = (W = 720) => ({ W, rowH: 26, gap: 8, left: 44, right: W - 58, seconds: 60 });

export function tracesFrame(W = 720): string {
  const TR = traceBox(W);
  const H = TRACES.length * (TR.rowH + TR.gap) + 14;
  const o: string[] = [`<path id="tr-shut" d="" fill="${INK.knot}" opacity="0.12"/>`];
  TRACES.forEach((t, i) => {
    const y0 = i * (TR.rowH + TR.gap);
    const base = y0 + TR.rowH;
    o.push(`<line x1="${TR.left}" x2="${TR.right}" y1="${base}" y2="${base}" stroke="${INK.line}" stroke-width="1"/>`);
    o.push(`<text x="0" y="${base - 4}" fill="${INK.muted}" font-size="8.5" ${MONO}>${t.label}</text>`);
    o.push(`<polyline id="tr-${t.key}" points="" fill="none" stroke="${t.color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`);
    o.push(`<text id="tv-${t.key}" x="${TR.W}" y="${base - 4}" text-anchor="end" fill="${INK.text}" font-size="8.5" ${MONO}></text>`);
  });
  o.push(`<text x="${TR.left}" y="${H - 2}" fill="${INK.faint}" font-size="7.5" ${MONO}>${TR.seconds} s ago</text>`);
  o.push(`<text x="${TR.right}" y="${H - 2}" text-anchor="end" fill="${INK.faint}" font-size="7.5" ${MONO}>now</text>`);
  return `<svg class="tr" viewBox="0 0 ${TR.W} ${H}" role="img" aria-label="The last minute of the model: tone, flow relative to rest, oxygen debt and the sensory nerves' spark, with the time the vessel was shut shaded.">${o.join('')}</svg>`;
}

// ---------- Figures on paper ----------

/** The band on a tone scale: rest, the reopening threshold, the fold. */
export function bandScale(s: SwitchInfo): string {
  const W = 340, x0 = 10, x1 = 330, y = 30;
  const X = (a: number) => x0 + a * (x1 - x0);
  return `<svg viewBox="0 0 ${W} 58" role="img" aria-label="Tone from 0 to 1: rest at ${s.urest.toFixed(2)}, reopening below ${s.Aopen.toFixed(2)}, shutting above ${s.Afold.toFixed(2)}.">
<rect x="${f1(X(s.Aopen))}" y="${y - 7}" width="${f1(X(s.Afold) - X(s.Aopen))}" height="14" rx="2" fill="${PAPER.faint}" opacity="0.35"/>
<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${PAPER.line}" stroke-width="1"/>
<line x1="${f1(X(s.urest))}" x2="${f1(X(s.urest))}" y1="${y - 9}" y2="${y + 9}" stroke="${PAPER.text}" stroke-width="1.5"/>
<text x="${f1(X(s.urest) - 4)}" y="${y - 11}" text-anchor="end" fill="${PAPER.text}" font-size="8.5" ${MONO}>rest ${s.urest.toFixed(2)}</text>
<text x="${f1((X(s.Aopen) + X(s.Afold)) / 2)}" y="${y - 11}" text-anchor="middle" fill="${PAPER.muted}" font-size="8" ${MONO}>open or shut</text>
<text x="${f1(X(s.Aopen))}" y="${y + 20}" text-anchor="end" fill="${PAPER.release}" font-size="8.5" ${MONO}>reopens ${s.Aopen.toFixed(2)}</text>
<text x="${f1(X(s.Afold))}" y="${y + 20}" text-anchor="start" fill="${PAPER.knot}" font-size="8.5" ${MONO}>shuts ${s.Afold.toFixed(2)}</text>
<text x="${x1}" y="${y + 20}" text-anchor="end" fill="${PAPER.faint}" font-size="8" ${MONO}>1</text>
</svg>`;
}

/** Horizontal bars on a log scale, labelled at their tips. */
export function logBars(rows: { label: string; value: number; unit: string; strong?: boolean }[], lo: number, hi: number, ticks: number[]): string {
  const W = 320, x0 = 4, x1 = 300, rowH = 26;
  const X = (v: number) => x0 + ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (x1 - x0);
  const H = rows.length * rowH + 20;
  const o: string[] = [];
  for (const t of ticks) o.push(`<line x1="${f1(X(t))}" x2="${f1(X(t))}" y1="0" y2="${H - 16}" stroke="${PAPER.line}" stroke-width="1"/><text x="${f1(X(t))}" y="${H - 4}" text-anchor="middle" fill="${PAPER.faint}" font-size="8" ${MONO}>${t >= 1000 ? `${t / 1000}k` : t}</text>`);
  rows.forEach((r, i) => {
    const y = i * rowH + 4;
    const w = Math.max(2, X(r.value) - x0);
    o.push(`<rect x="${x0}" y="${y}" width="${f1(w)}" height="10" rx="2" fill="${r.strong ? PAPER.ink : PAPER.faint}"><title>${r.label}: ${r.value.toLocaleString('en-GB', { maximumSignificantDigits: 2 })} ${r.unit}</title></rect>`);
    o.push(`<text x="${x0}" y="${y + 21}" fill="${PAPER.text}" font-size="8.5" ${MONO}>${r.label} · ${r.value.toLocaleString('en-GB', { maximumSignificantDigits: 2 })} ${r.unit}</text>`);
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${rows.map((r) => `${r.label}: ${r.value} ${r.unit}`).join('; ')}">${o.join('')}</svg>`;
}

/** Bars 0–1 (shares or indices), labelled at their tips. */
export function shareBars(rows: { label: string; value: number; fmt?: (v: number) => string }[]): string {
  const W = 360, x0 = 196, x1 = 326, rowH = 20;
  const H = rows.length * rowH + 4;
  const o: string[] = [];
  rows.forEach((r, i) => {
    const y = i * rowH + 4;
    const v = Math.min(Math.max(r.value, 0), 1);
    const txt = r.fmt ? r.fmt(r.value) : `${Math.round(100 * r.value)}%`;
    o.push(`<text x="${x0 - 8}" y="${y + 9}" text-anchor="end" fill="${PAPER.text}" font-size="8.5" ${MONO}>${r.label}</text>`);
    o.push(`<rect x="${x0}" y="${y}" width="${x1 - x0}" height="11" rx="2" fill="${PAPER.line}" opacity="0.6"/>`);
    o.push(`<rect x="${x0}" y="${y}" width="${f1(Math.max(2, v * (x1 - x0)))}" height="11" rx="2" fill="${PAPER.ink}"><title>${r.label}: ${txt}</title></rect>`);
    o.push(`<text x="${x1 + 6}" y="${y + 9}" fill="${PAPER.text}" font-size="8.5" ${MONO}>${txt}</text>`);
  });
  return `<svg viewBox="0 0 ${W + 30} ${H}" role="img" aria-label="${rows.map((r) => `${r.label}: ${r.fmt ? r.fmt(r.value) : Math.round(100 * r.value) + '%'}`).join('; ')}">${o.join('')}</svg>`;
}
