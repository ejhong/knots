/**
 * Figures for the research page, as SVG strings drawn at build time from the exported runs (src/data/sim/vessel.json).
 *
 * Colour follows docs/DESIGN.md and ./draw.ts: terracotta is a held knot and nothing else; jade is release; the hand's
 * events are bronze; structure is ink and stone. On paper the knot/release pair is #c4452f / #3f8f73; on ink,
 * #e27b61 / #a8e6cd. Identity is never colour alone: held cells carry a dot, released ones a number; series carry
 * direct labels and differ by dash. Every mark has a <title> for hover.
 */
import { INK, PAPER } from './draw';

const MONO = 'font-family="SF Mono, Menlo, Monaco, monospace"';
const SERIF = 'font-family="Georgia, serif"';
const CJK = "font-family=\"'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', 'Songti SC', serif\"";
const f1 = (n: number) => n.toFixed(1);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pctLabel = (x: number) => `${Math.round(100 * x)}%`;

// ---------- Breath: release maps ----------

export interface BreathMaps {
  depths: number[];
  breath_period: number;
  breaths: number;
  rows: { label: string; route: string; size: number; release_s: (number | null)[] }[];
  least_movement: { within_3: (number | null)[]; within_10: (number | null)[] };
}

const ROUTE_TEXT: Record<string, { name: string; size: (x: number) => string; what: string }> = {
  even: { name: 'drive, even', size: (x) => `±${x.toFixed(2)}`, what: 'each breath swings drive up and down by' },
  uneven: { name: 'drive, uneven', size: (x) => `−${x.toFixed(2)}`, what: 'each out-breath lowers drive by up to' },
  settling: { name: 'drive, settling', size: (x) => `−${x.toFixed(2)}`, what: 'drive eases over a minute and stays down by' },
  movement: { name: 'movement', size: (x) => pctLabel(x), what: 'each breath deforms the tissue at the knot by' },
};

/** A grid: one row per way the breath might act, one column per knot depth; the breath on which the knot lets go. */
export function releaseMap(m: BreathMaps): string {
  const W = 680;
  const left = 150;
  const top = 46;
  const cw = (W - left - 8) / m.depths.length;
  const ch = 21;
  const gap = 2;
  const groupGap = 9;
  const out: string[] = [];
  let y = top;
  let last = '';
  const rows: { y: number; r: BreathMaps['rows'][number] }[] = [];
  for (const r of m.rows) {
    if (r.route !== last && last) y += groupGap;
    rows.push({ y, r });
    y += ch + gap;
    last = r.route;
  }
  const H = y + 30;
  // Column heads.
  out.push(`<text x="${left}" y="12" fill="${PAPER.muted}" font-size="9" ${MONO}>how far above its reopening threshold the knot sits (share of the band) →</text>`);
  m.depths.forEach((d, j) => {
    out.push(`<text x="${f1(left + cw * j + cw / 2)}" y="${top - 10}" text-anchor="middle" fill="${PAPER.text}" font-size="9.5" ${MONO}>${pctLabel(d)}</text>`);
  });
  out.push(`<text x="${f1(left + cw * 0.5)}" y="${top - 24}" text-anchor="middle" fill="${PAPER.faint}" font-size="8" ${MONO}>easy</text>`);
  out.push(`<text x="${f1(left + cw * (m.depths.length - 0.5))}" y="${top - 24}" text-anchor="middle" fill="${PAPER.faint}" font-size="8" ${MONO}>deep</text>`);
  // Rows.
  last = '';
  for (const { y: ry, r } of rows) {
    const t = ROUTE_TEXT[r.route];
    if (r.route !== last) {
      out.push(`<text x="0" y="${f1(ry + 14)}" fill="${PAPER.text}" font-size="10" font-weight="600" font-family="-apple-system, 'Segoe UI', sans-serif">${t.name}</text>`);
    }
    last = r.route;
    out.push(`<text x="${left - 10}" y="${f1(ry + 14)}" text-anchor="end" fill="${PAPER.muted}" font-size="9" ${MONO}>${t.size(r.size)}</text>`);
    r.release_s.forEach((sec, j) => {
      const x = left + cw * j + 1;
      const w = cw - gap;
      const depth = pctLabel(m.depths[j]);
      if (sec === null) {
        const tip = `${t.name}, ${t.what} ${t.size(r.size)}: a knot ${depth} up the band holds through ${m.breaths} breaths`;
        out.push(`<g><title>${esc(tip)}</title><rect x="${f1(x)}" y="${f1(ry)}" width="${f1(w)}" height="${ch}" rx="4" fill="${PAPER.knot}" fill-opacity="0.06"/><circle cx="${f1(x + w / 2)}" cy="${f1(ry + ch / 2)}" r="3.4" fill="${PAPER.knot}"/></g>`);
      } else {
        const breaths = Math.max(1, Math.ceil(sec / m.breath_period));
        const strength = 1 - (breaths - 1) / (m.breaths - 1);
        const tip = `${t.name}, ${t.what} ${t.size(r.size)}: a knot ${depth} up the band lets go ${Math.round(sec)} s in, on breath ${breaths}`;
        out.push(`<g><title>${esc(tip)}</title><rect x="${f1(x)}" y="${f1(ry)}" width="${f1(w)}" height="${ch}" rx="4" fill="${PAPER.release}" fill-opacity="${(0.14 + 0.62 * strength).toFixed(2)}"/><text x="${f1(x + w / 2)}" y="${f1(ry + 14)}" text-anchor="middle" fill="${strength > 0.55 ? '#ffffff' : PAPER.text}" font-size="9.5" ${MONO}>${breaths}</text></g>`);
      }
    });
  }
  // Legend.
  const ly = H - 12;
  out.push(`<rect x="${left}" y="${ly - 9}" width="18" height="12" rx="3" fill="${PAPER.release}" fill-opacity="0.7"/><text x="${left + 24}" y="${ly}" fill="${PAPER.muted}" font-size="9" ${MONO}>lets go on this breath (darker: sooner)</text>`);
  out.push(`<circle cx="${left + 290}" cy="${ly - 3}" r="3.4" fill="${PAPER.knot}"/><text x="${left + 299}" y="${ly}" fill="${PAPER.muted}" font-size="9" ${MONO}>still held after ${m.breaths} breaths</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Release maps: the breath on which a knot lets go, for each way the breath might act and each depth of knot">${out.join('')}</svg>`;
}

/** The least movement per breath that releases a knot of each depth, within 3 and within 10 breaths. */
export function leastMovement(m: BreathMaps): string {
  const W = 420;
  const H = 244;
  const L = 46;
  const R = W - 60;
  const T = 34;
  const B = H - 38;
  const X = (d: number) => L + (d / 0.8) * (R - L);
  const Y = (a: number) => B - a * (B - T);
  const out: string[] = [];
  out.push(`<line x1="${L}" x2="${R}" y1="${B}" y2="${B}" stroke="${PAPER.line}" stroke-width="1"/><line x1="${L}" x2="${L}" y1="${T}" y2="${B}" stroke="${PAPER.line}" stroke-width="1"/>`);
  for (const a of [0, 0.25, 0.5, 0.75, 1]) {
    out.push(`<text x="${L - 6}" y="${f1(Y(a) + 3)}" text-anchor="end" fill="${PAPER.faint}" font-size="8.5" ${MONO}>${pctLabel(a)}</text>`);
    if (a > 0) out.push(`<line x1="${L}" x2="${R}" y1="${f1(Y(a))}" y2="${f1(Y(a))}" stroke="${PAPER.line}" stroke-width="0.6" stroke-dasharray="2 4"/>`);
  }
  for (const d of [0, 0.2, 0.4, 0.6, 0.8]) {
    out.push(`<text x="${f1(X(d))}" y="${B + 13}" text-anchor="middle" fill="${PAPER.faint}" font-size="8.5" ${MONO}>${pctLabel(d)}</text>`);
  }
  out.push(`<text x="${R}" y="${B + 28}" text-anchor="end" fill="${PAPER.muted}" font-size="8.5" ${MONO}>knot depth (share of the band) →</text>`);
  out.push(`<text x="${L - 30}" y="10" fill="${PAPER.muted}" font-size="8.5" ${MONO}>↑ movement per breath (share of a squeeze that shuts it)</text>`);
  const series = [
    { key: 'within_10' as const, label: 'within 10 breaths', dash: '', width: 2, at: 0.35, dx: 8, dy: 14 },
    { key: 'within_3' as const, label: 'within 3 breaths', dash: '5 4', width: 2, at: 0.5, dx: -6, dy: -9, end: true },
  ];
  for (const s of series) {
    const pts = m.depths.map((d, i) => [d, m.least_movement[s.key][i]] as const).filter((p): p is readonly [number, number] => p[1] !== null);
    if (!pts.length) continue;
    out.push(`<path d="${pts.map(([d, a], i) => `${i ? 'L' : 'M'}${f1(X(d))} ${f1(Y(a))}`).join(' ')}" fill="none" stroke="${PAPER.release}" stroke-width="${s.width}" stroke-dasharray="${s.dash}" stroke-linecap="round" stroke-linejoin="round"/>`);
    for (const [d, a] of pts) {
      out.push(`<g><title>${esc(`${s.label}: a knot ${pctLabel(d)} up the band needs the breath to deform the tissue by ${pctLabel(a)} of a squeeze that shuts the vessel`)}</title><circle cx="${f1(X(d))}" cy="${f1(Y(a))}" r="9" fill="transparent"/><circle cx="${f1(X(d))}" cy="${f1(Y(a))}" r="3.2" fill="${PAPER.release}" stroke="#faf7f2" stroke-width="1.5"/></g>`);
    }
    const anchor = pts.find(([d]) => d === s.at) ?? pts[0];
    out.push(`<text x="${f1(X(anchor[0]) + s.dx)}" y="${f1(Y(anchor[1]) + s.dy)}"${'end' in s ? ' text-anchor="end"' : ''} fill="${PAPER.text}" font-size="9" ${MONO}>${s.label}</text>`);
    // Depths no movement reaches.
    m.depths.forEach((d, i) => {
      if (m.least_movement[s.key][i] === null) {
        out.push(`<g><title>${esc(`${s.label}: no movement up to a full squeeze releases a knot ${pctLabel(d)} up the band`)}</title><circle cx="${f1(X(d))}" cy="${f1(Y(1.04))}" r="3.4" fill="none" stroke="${PAPER.knot}" stroke-width="1.4"/></g>`);
      }
    });
  }
  out.push(`<text x="${R + 6}" y="${f1(Y(1.04) + 3)}" fill="${PAPER.muted}" font-size="8.5" ${MONO}>none will</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="The least movement per breath that releases a knot of each depth">${out.join('')}</svg>`;
}

// ---------- Trees: a parent and its children ----------

export interface TreeFigure {
  u_m: number;
  walls: number[];
  t: number[];
  x: number[][];
  shut: number[][];
  Pn: number[];
  events: { t: number; vessel: number; to: string }[];
  surge: number[];
  press: number[];
  calm: number;
}

/** The parent and its four children: a schematic, the state of each over time, and the pressure below the parent. */
export function treeStory(f: TreeFigure): string {
  const W = 700;
  const H = 356;
  const out: string[] = [];
  // Schematic, left.
  const sx = 92;
  const sy = 30;
  const kids = f.walls.length - 1;
  const leaf = (k: number) => 32 + k * 40;
  out.push(`<text x="14" y="16" fill="${INK.muted}" font-size="9" ${MONO}>the tree</text>`);
  out.push(`<path d="M${sx} ${sy} L${sx} ${sy + 62}" stroke="${INK.vessel}" stroke-width="4" stroke-linecap="round"/>`);
  for (let k = 0; k < kids; k++) {
    const x = leaf(k) - 30;
    out.push(`<path d="M${sx} ${sy + 62} C ${sx} ${sy + 84}, ${x + 30} ${sy + 80}, ${x + 30} ${sy + 110} L${x + 30} ${sy + 150}" fill="none" stroke="${INK.vessel}" stroke-width="${f1(1.6 + 3 * (f.walls[k + 1] - 0.24))}" stroke-linecap="round"/>`);
    out.push(`<text x="${x + 30}" y="${sy + 166}" text-anchor="middle" fill="${INK.muted}" font-size="8.5" ${MONO}>${k + 1}</text>`);
  }
  out.push(`<circle cx="${sx}" cy="${sy + 30}" r="5.5" fill="${INK.knot}"/><text x="${sx + 10}" y="${sy + 33}" fill="${INK.text}" font-size="9" ${MONO}>parent</text>`);
  out.push(`<text x="14" y="${sy + 186}" fill="${INK.faint}" font-size="8" ${MONO}>children 1→4:</text><text x="14" y="${sy + 197}" fill="${INK.faint}" font-size="8" ${MONO}>thin wall → thick</text>`);
  out.push(`<text x="14" y="${sy + 214}" fill="${INK.faint}" font-size="8" ${MONO}>source 100 mmHg</text><text x="14" y="${sy + 225}" fill="${INK.faint}" font-size="8" ${MONO}>beds 20 mmHg</text>`);
  // Raster, right.
  const L = 250;
  const R = W - 22;
  const T = 30;
  const rowH = 22;
  const tmax = f.t[f.t.length - 1];
  const X = (t: number) => L + (t / tmax) * (R - L);
  const rowY = (j: number) => T + j * (rowH + 6);
  const bandEnd = rowY(kids) + rowH;
  // The hand and the stress, as bands behind.
  out.push(`<rect x="${f1(X(f.surge[0]))}" y="${T - 12}" width="${f1(X(f.surge[1]) - X(f.surge[0]))}" height="${f1(bandEnd - T + 12)}" fill="${INK.knot}" opacity="0.08"/>`);
  out.push(`<text x="${f1(X(f.surge[0]) + 2)}" y="${T - 4}" fill="${INK.muted}" font-size="8" ${MONO}>surge at the parent</text>`);
  out.push(`<rect x="${f1(X(f.press[0]))}" y="${T - 12}" width="${f1(X(f.press[1]) - X(f.press[0]))}" height="${f1(bandEnd - T + 12)}" fill="${INK.ochre}" opacity="0.12"/>`);
  out.push(`<text x="${f1(X(f.press[0]) + 2)}" y="${T - 4}" fill="${INK.ochre}" font-size="8" ${MONO}>parent pressed, then released</text>`);
  out.push(`<line x1="${f1(X(f.calm))}" x2="${f1(X(f.calm))}" y1="${T - 12}" y2="${f1(bandEnd)}" stroke="${INK.spark}" stroke-width="1" stroke-dasharray="3 3" opacity="0.8"/>`);
  out.push(`<text x="${f1(X(f.calm) + 3)}" y="${T - 4}" fill="${INK.spark}" font-size="8" ${MONO}>calm</text>`);
  for (let j = 0; j <= kids; j++) {
    const y = rowY(j);
    const name = j === 0 ? 'parent' : `child ${j}`;
    out.push(`<text x="${L - 8}" y="${y + 14}" text-anchor="end" fill="${INK.muted}" font-size="8.5" ${MONO}>${name}</text>`);
    out.push(`<line x1="${L}" x2="${R}" y1="${y + rowH / 2}" y2="${y + rowH / 2}" stroke="${INK.line}" stroke-width="1"/>`);
    // Held segments.
    let start = -1;
    for (let i = 0; i <= f.t.length; i++) {
      const held = i < f.t.length && f.shut[i][j] === 1;
      if (held && start < 0) start = i;
      if (!held && start >= 0) {
        const a = f.t[start];
        const b = f.t[i - 1];
        out.push(`<g><title>${esc(`${name} held from ${Math.round(a)} s to ${Math.round(b)} s`)}</title><rect x="${f1(X(a))}" y="${y + 4}" width="${f1(Math.max(2, X(b) - X(a)))}" height="${rowH - 8}" rx="4" fill="${INK.knot}"/></g>`);
        start = -1;
      }
    }
  }
  // Sparks where each lets go.
  for (const e of f.events) {
    if (e.to !== 'open') continue;
    const y = rowY(e.vessel) + rowH / 2;
    out.push(`<g><title>${esc(`${e.vessel === 0 ? 'parent' : `child ${e.vessel}`} lets go at ${e.t.toFixed(1)} s`)}</title><circle cx="${f1(X(e.t))}" cy="${f1(y)}" r="4" fill="${INK.spark}" stroke="${INK.bg}" stroke-width="1.5"/></g>`);
  }
  // Pressure below the parent, its own small chart (not a second axis).
  const pT = bandEnd + 34;
  const pB = pT + 62;
  const pMax = 100;
  const PY = (P: number) => pB - (P / pMax) * (pB - pT);
  out.push(`<text x="${L - 8}" y="${pT + 4}" text-anchor="end" fill="${INK.muted}" font-size="8.5" ${MONO}>pressure</text><text x="${L - 8}" y="${pT + 15}" text-anchor="end" fill="${INK.muted}" font-size="8.5" ${MONO}>below the</text><text x="${L - 8}" y="${pT + 26}" text-anchor="end" fill="${INK.muted}" font-size="8.5" ${MONO}>parent</text>`);
  for (const P of [0, 50, 100]) {
    out.push(`<line x1="${L}" x2="${R}" y1="${f1(PY(P))}" y2="${f1(PY(P))}" stroke="${INK.line}" stroke-width="${P === 0 ? 1 : 0.6}" ${P ? 'stroke-dasharray="2 4"' : ''}/><text x="${R + 2}" y="${f1(PY(P) + 3)}" fill="${INK.faint}" font-size="7.5" ${MONO}>${P}</text>`);
  }
  out.push(`<path d="${f.t.map((t, i) => `${i ? 'L' : 'M'}${f1(X(t))} ${f1(PY(Math.min(f.Pn[i], pMax)))}`).join(' ')}" fill="none" stroke="${INK.vessel}" stroke-width="1.6" stroke-linejoin="round"/>`);
  out.push(`<text x="${R - 2}" y="${pT - 4}" text-anchor="end" fill="${INK.faint}" font-size="7.5" ${MONO}>mmHg</text>`);
  // Time axis.
  for (const t of [0, 60, 120, 180, 240, 300]) {
    if (t > tmax) continue;
    out.push(`<text x="${f1(X(t))}" y="${pB + 13}" text-anchor="middle" fill="${INK.faint}" font-size="8" ${MONO}>${t}</text>`);
  }
  out.push(`<text x="${R}" y="${pB + 26}" text-anchor="end" fill="${INK.muted}" font-size="8.5" ${MONO}>seconds →</text>`);
  // Legend.
  out.push(`<rect x="14" y="${H - 58}" width="18" height="10" rx="3" fill="${INK.knot}"/><text x="38" y="${H - 49}" fill="${INK.muted}" font-size="8.5" ${MONO}>held: a knot</text>`);
  out.push(`<circle cx="23" cy="${H - 34}" r="4" fill="${INK.spark}"/><text x="38" y="${H - 31}" fill="${INK.muted}" font-size="8.5" ${MONO}>lets go</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="A parent vessel and its four children: when the parent holds, its children shut; when it is released, most let go within a second; the thickest-walled child stays until calm">${out.join('')}</svg>`;
}

// ---------- What would settle it: the decision tree ----------

/** The first measurements, in order, and where each outcome points. A diagram; the words are the content. */
export function decisionTree(): string {
  const W = 700;
  const shift = 78;
  const H = 400 + shift;
  const out: string[] = [];
  const head: string[] = [];
  // 0. Before any recording: where are they?
  head.push(`<rect x="120" y="10" width="460" height="46" rx="7" fill="${INK.bg}" stroke="${INK.ochre}" stroke-width="1.2" stroke-dasharray="4 3"/>`);
  head.push(`<text x="132" y="27" fill="${INK.text}" font-size="10" ${SERIF}>0. Before any recording: are the knots where a theory's anatomy puts them?</text>`);
  head.push(`<text x="132" y="41" fill="${INK.muted}" font-size="9" ${MONO}>palpation, blinded, against a Doppler map, an endplate map, the layers</text>`);
  head.push(`<path d="M350 56 L350 ${shift + 12}" stroke="${INK.faint}" stroke-width="1"/><path d="M346 ${shift + 7} L350 ${shift + 12} L354 ${shift + 7}" fill="none" stroke="${INK.faint}" stroke-width="1"/>`);
  out.push(`<g transform="translate(0 ${shift})">`);
  const box = (x: number, y: number, w: number, h: number, lines: string[], opts: { kind?: 'q' | 'leaf'; glyph?: string } = {}) => {
    const q = opts.kind !== 'leaf';
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${q ? INK.bg : '#2b3134'}" stroke="${q ? INK.ochre : INK.line}" stroke-width="${q ? 1.2 : 1}"/>`);
    lines.forEach((l, i) => {
      out.push(`<text x="${x + (opts.glyph ? 34 : 12)}" y="${y + 17 + i * 13}" fill="${q ? INK.text : INK.muted}" font-size="${q ? 10 : 9.5}" ${q ? SERIF : MONO}>${esc(l)}</text>`);
    });
    if (opts.glyph && [...opts.glyph].length === 1) out.push(`<text x="${x + 10}" y="${y + h / 2 + 7}" fill="${INK.spark}" font-size="17" ${CJK}>${opts.glyph}</text>`);
    else if (opts.glyph) [...opts.glyph].forEach((g, i) => out.push(`<text x="${x + 12}" y="${y + h / 2 - 2 + i * 13}" fill="${INK.spark}" font-size="12" ${CJK}>${g}</text>`));
  };
  const edge = (x1: number, y1: number, x2: number, y2: number, label: string, lx = (x1 + x2) / 2, ly = (y1 + y2) / 2) => {
    out.push(`<path d="M${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}" fill="none" stroke="${INK.faint}" stroke-width="1"/>`);
    if (label) out.push(`<text x="${lx}" y="${ly}" text-anchor="middle" fill="${INK.ochre}" font-size="8.5" ${MONO} paint-order="stroke" stroke="${INK.bg}" stroke-width="5" stroke-linejoin="round">${esc(label)}</text>`);
  };
  // 1. Anything local at all?
  box(170, 12, 360, 46, ['1. At the moment of release, does anything change in the', 'tissue at the site, and not at a sham site nearby?']);
  edge(260, 58, 88, 96, 'no', 150, 80);
  box(10, 96, 160, 46, ['Perception favoured:', 'made in the nervous system'], { kind: 'leaf', glyph: '覚' });
  edge(440, 58, 440, 96, 'yes', 454, 80);
  // 2. Where, and in what?
  box(260, 96, 360, 46, ['2. Where, and in what? Flow in the skin, flow or', 'stiffness in the muscle, glide between layers, the nerve?']);
  const leaves = [
    { x: 10, cond: 'skin flow, in seconds', name: 'Perforators', sub: 'at the fascia', glyph: '結' },
    { x: 184, cond: 'muscle flow, stiffness', name: 'Trigger points', sub: 'or a latch in muscle', glyph: '点閂' },
    { x: 358, cond: 'glide between layers', name: 'Densification', sub: 'the loose layers', glyph: '膠' },
    { x: 532, cond: 'nerve signs only', name: 'Nerves', sub: 'where they pierce', glyph: '神経' },
  ];
  for (const l of leaves) {
    edge(440, 142, l.x + 79, 188, l.cond, l.x + 79, 176);
    box(l.x, 188, 158, 40, [l.name, l.sub], { kind: 'leaf', glyph: l.glyph });
  }
  // 3. For a vascular answer: which route, and does it cluster?
  box(10, 270, 330, 46, ['3. Which breath route? Tissue strain at the site before', 'release (movement), or flow falling at sham sites (drive)?']);
  edge(89, 228, 175, 270, '', 0, 0);
  out.push(`<text x="118" y="252" fill="${INK.ochre}" font-size="8.5" ${MONO} paint-order="stroke" stroke="${INK.bg}" stroke-width="5" stroke-linejoin="round">if vascular</text>`);
  box(360, 270, 330, 46, ['4. When a parent lets go, does a flow surge spread over', 'its cluster within seconds, and does one stay behind?']);
  edge(89, 228, 525, 270, '', 0, 0);
  box(10, 338, 330, 46, ['Ultrasound speckle tracking, laser speckle at a sham', 'site, skin sympathetic nerve activity'], { kind: 'leaf' });
  box(360, 338, 330, 46, ['Laser speckle over the cluster, an event marker', 'at each felt release'], { kind: 'leaf' });
  out.push(`<path d="M175 316 L175 338 M525 316 L525 338" stroke="${INK.faint}" stroke-width="1"/>`);
  out.push('</g>');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="What would settle it: first, whether knots sit where a theory's anatomy puts them; then whether anything changes locally at release; then where and in what; then, for a vascular answer, the breath's route and clusters">${head.join('')}${out.join('')}</svg>`;
}

// ---------- The field: broad and focused ----------

export interface FieldStudy {
  n: number;
  pos: number[][];
  zone: number[];
  spot: number[];
  radius: number;
  breaths: number;
  period: number;
  conditions: Record<string, { knots: number; freed: number; knots_near: number; freed_near: number; knots_far: number; freed_far: number; knot: number[]; released_s: (number | null)[] }>;
}

const FIELD_ROWS: [string, string][] = [
  ['broad', 'broad: drive eases everywhere'],
  ['focused', 'focused: the breath moves one spot'],
  ['both', 'both'],
];

/** Small multiples: each row a way the breath acts, each column the patch after so many breaths. */
export function fieldPanels(f: FieldStudy, after: number[] = [0, 5, 15, 30]): string {
  const P = 138;
  const gap = 14;
  const left = 150;
  const top = 26;
  const W = left + after.length * (P + gap);
  const H = top + FIELD_ROWS.length * (P + gap) + 34;
  const out: string[] = [];
  after.forEach((b, c) => {
    out.push(`<text x="${f1(left + c * (P + gap) + P / 2)}" y="${top - 10}" text-anchor="middle" fill="${PAPER.muted}" font-size="9" ${MONO}>${b === 0 ? 'as the breath begins' : `after ${b} breaths`}</text>`);
  });
  FIELD_ROWS.forEach(([key, label], r) => {
    const cond = f.conditions[key];
    const y0 = top + r * (P + gap);
    out.push(`<text x="0" y="${f1(y0 + 16)}" fill="${PAPER.text}" font-size="10" font-weight="600" font-family="-apple-system, 'Segoe UI', sans-serif">${esc(label.split(':')[0])}</text>`);
    if (label.includes(':')) out.push(`<text x="0" y="${f1(y0 + 30)}" fill="${PAPER.muted}" font-size="9" ${SERIF} font-style="italic">${esc(label.split(': ')[1])}</text>`);
    const freedAll = cond.released_s.filter((x, i) => cond.knot[i] && x !== null && x <= after[after.length - 1] * f.period).length;
    out.push(`<text x="0" y="${f1(y0 + 50)}" fill="${PAPER.muted}" font-size="9" ${MONO}>${freedAll} of ${cond.knots} let go</text>`);
    after.forEach((b, c) => {
      const x0 = left + c * (P + gap);
      const t = b * f.period;
      out.push(`<rect x="${x0}" y="${f1(y0)}" width="${P}" height="${P}" rx="6" fill="#f3eee7" stroke="${PAPER.line}" stroke-width="1"/>`);
      if (key !== 'broad') {
        out.push(`<circle cx="${f1(x0 + f.spot[0] * P)}" cy="${f1(y0 + (1 - f.spot[1]) * P)}" r="${f1(f.radius * P * 1.6)}" fill="#c9a45f" fill-opacity="0.13" stroke="#c9a45f" stroke-opacity="0.5" stroke-dasharray="2 3"/>`);
      }
      f.pos.forEach(([px, py], i) => {
        const cx = x0 + px * P;
        const cy = y0 + (1 - py) * P;
        const rel = cond.released_s[i];
        if (!cond.knot[i]) {
          out.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="1.1" fill="${PAPER.faint}"/>`);
        } else if (rel !== null && rel <= t) {
          out.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="2.6" fill="none" stroke="${PAPER.release}" stroke-width="1.3"/>`);
        } else {
          out.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="2.9" fill="${PAPER.knot}"/>`);
        }
      });
    });
  });
  const ly = H - 12;
  out.push(`<circle cx="${left + 5}" cy="${ly - 3}" r="2.9" fill="${PAPER.knot}"/><text x="${left + 13}" y="${ly}" fill="${PAPER.muted}" font-size="9" ${MONO}>held</text>`);
  out.push(`<circle cx="${left + 65}" cy="${ly - 3}" r="2.6" fill="none" stroke="${PAPER.release}" stroke-width="1.3"/><text x="${left + 73}" y="${ly}" fill="${PAPER.muted}" font-size="9" ${MONO}>let go</text>`);
  out.push(`<circle cx="${left + 135}" cy="${ly - 3}" r="1.1" fill="${PAPER.faint}"/><text x="${left + 143}" y="${ly}" fill="${PAPER.muted}" font-size="9" ${MONO}>no knot</text>`);
  out.push(`<circle cx="${left + 215}" cy="${ly - 3}" r="6" fill="#c9a45f" fill-opacity="0.13" stroke="#c9a45f" stroke-opacity="0.5" stroke-dasharray="2 3"/><text x="${left + 226}" y="${ly}" fill="${PAPER.muted}" font-size="9" ${MONO}>where the breath moves the tissue</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="A patch of knots under one breath: broad release takes easy knots everywhere; focused release takes the knots at one spot; both together take all the knots at the spot and the easy ones everywhere">${out.join('')}</svg>`;
}

// ---------- Time: how a knot sets (length adaptation) ----------

export interface AdaptStudy {
  share: number;
  tau_h: number;
  healthy: AdaptWall;
  hypertensive: AdaptWall;
  stories: { hold_mult: number; hour: AdaptStory; three: AdaptStory };
  flushes: { held_h: number; lo: number; holds_at_rest: boolean; peak_flow: number; flush_h: number; reshut_h: number | null }[];
  lab: { diameter: number; tone_over_rest: number; shuts_h: number | null };
  remodel: { shrink: number; aopen_over_rest: number; adapted_aopen_over_rest: number; before: number };
  robustness: { samples: number; share_bistable: number; share_sets: number; share_sets_within: number; within_h: number; set_h: (number | null)[] };
}
interface AdaptWall {
  urest: number;
  aopen_over_rest: number;
  afold_over_rest: number;
  adapted_aopen_over_rest: number;
  set_h: { mult: number; hours: number | null }[];
  creep_h: { mult: number; hours: number | null }[];
}
interface AdaptStory {
  held_h: number;
  stays: boolean;
  /** [hours, tone ÷ rest, reopening tone ÷ rest, flow ÷ rest] */
  series: number[][];
}

const hLabel = (h: number) => (h === 0.5 ? '½ h' : `${h} h`);

/** Four panels: a knot held for an hour or for three (does it outlast its stress?), the flush at release by how long
 *  the knot was held, and how long a hold takes to set a knot, for healthy and hypertensive walls. */
export function knotSets(a: AdaptStudy): string {
  const W = 720;
  const H = 500;
  const out: string[] = [];
  const axisText = (x: number, y: number, s: string, anchor = 'middle') =>
    `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" fill="${PAPER.faint}" font-size="8.5" ${MONO}>${s}</text>`;
  const frame = (L: number, R: number, T: number, B: number) =>
    `<line x1="${L}" x2="${R}" y1="${B}" y2="${B}" stroke="${PAPER.line}" stroke-width="1"/><line x1="${L}" x2="${L}" y1="${T}" y2="${B}" stroke="${PAPER.line}" stroke-width="1"/>`;

  // Top: the two stories, as small multiples on the same scales.
  const stories = [a.stories.hour, a.stories.three];
  stories.forEach((st, k) => {
    const L = 44 + k * 360;
    const R = L + 296;
    const T = 40;
    const B = 168;
    const X = (h: number) => L + (h / 6) * (R - L);
    const Y = (m: number) => B - (Math.min(m, 5) / 5) * (B - T);
    const [t, tone, thr, q] = st.series;
    out.push(frame(L, R, T, B));
    for (const m of [1, 2, 3, 4, 5]) {
      out.push(axisText(L - 6, Y(m) + 3, `${m}×`, 'end'));
      out.push(`<line x1="${L}" x2="${R}" y1="${f1(Y(m))}" y2="${f1(Y(m))}" stroke="${PAPER.line}" stroke-width="0.6" stroke-dasharray="2 4"/>`);
    }
    for (const h of [0, 1, 2, 3, 4, 5, 6]) out.push(axisText(X(h), B + 13, `${h}`));
    out.push(axisText(R, B + 27, 'hours →', 'end'));
    out.push(`<text x="${L}" y="${T - 22}" fill="${PAPER.text}" font-size="10" ${MONO}>held ${st.held_h} h at ${a.stories.hold_mult}× resting tone, then rest</text>`);
    out.push(`<text x="${L}" y="${T - 9}" fill="${PAPER.muted}" font-size="8.5" ${MONO}>${st.stays ? 'it outlasts its stress: still shut at rest' : 'it lets go when stress ends'}</text>`);
    // Tone: the command, as a step.
    out.push(`<path d="${t.map((h, i) => `${i ? 'L' : 'M'}${f1(X(h))} ${f1(Y(tone[i]))}`).join(' ')}" fill="none" stroke="${PAPER.ink}" stroke-width="1.6" stroke-linejoin="round"/>`);
    const toneLabelAt = t.findIndex((h) => h >= 0.25);
    out.push(`<text x="${f1(X(t[toneLabelAt]))}" y="${f1(Y(tone[toneLabelAt]) - 6)}" fill="${PAPER.ink}" font-size="8.5" ${MONO}>tone</text>`);
    // The tone below which the shut vessel would reopen, while it is shut.
    const shut = q.map((v) => v === 0);
    const thrPts = t.map((h, i) => [h, thr[i]] as const).filter((_, i) => shut[i]);
    out.push(`<path d="${thrPts.map(([h, m], i) => `${i ? 'L' : 'M'}${f1(X(h))} ${f1(Y(m))}`).join(' ')}" fill="none" stroke="${PAPER.knot}" stroke-width="1.6" stroke-dasharray="5 3"/>`);
    const li = t.findIndex((h) => h >= 0.35);
    out.push(`<text x="${f1(X(t[li]) + 6)}" y="${f1(Y(thr[li]) - 13)}" fill="${PAPER.knot}" font-size="8.5" ${MONO}>reopens below this</text>`);
    // Where the threshold falls through rest: from here the knot holds at resting tone.
    const cross = thrPts.findIndex(([, m]) => m < 1);
    if (cross > 0) {
      const [hc] = thrPts[cross];
      out.push(`<g><title>${esc(`after ${hc.toFixed(1)} h held, the knot would stay shut even at resting tone`)}</title><circle cx="${f1(X(hc))}" cy="${f1(Y(1))}" r="3.2" fill="${PAPER.knot}"/></g>`);
      out.push(`<text x="${f1(X(hc) + 6)}" y="${B - 5}" fill="${PAPER.text}" font-size="8.5" ${MONO}>set: holds at rest</text>`);
    }
    // State: a strip under the plot, terracotta while shut, jade once open.
    const stripY = B + 32;
    for (let i = 0; i < t.length - 1; i++) {
      out.push(`<rect x="${f1(X(t[i]))}" y="${stripY}" width="${f1(X(t[i + 1]) - X(t[i]) + 0.4)}" height="7" fill="${shut[i] ? PAPER.knot : PAPER.release}" opacity="${shut[i] ? 0.9 : 0.75}"/>`);
    }
    const opened = shut.findIndex((s) => !s);
    const st_ = opened >= 0 ? `shut, then open: flow ${q[Math.min(opened + 2, q.length - 1)].toFixed(2)}× rest, the vessel narrowed` : 'shut throughout';
    out.push(`<text x="${L}" y="${stripY + 19}" fill="${PAPER.muted}" font-size="8.5" ${MONO}>${esc(st_)}</text>`);
  });

  // Bottom left: the flow a knot opens to when let go, by how long it had been held.
  {
    const L = 44;
    const R = L + 296;
    const T = 300;
    const B = 440;
    const Y = (qv: number) => B - (Math.min(qv, 3.5) / 3.5) * (B - T);
    const n = a.flushes.length;
    const slot = (R - L) / n;
    out.push(frame(L, R, T, B));
    for (const m of [0, 1, 2, 3]) out.push(axisText(L - 6, Y(m) + 3, `${m}×`, 'end'));
    out.push(`<text x="${L}" y="${T - 22}" fill="${PAPER.text}" font-size="10" ${MONO}>let go: the blood flow it opens to</text>`);
    out.push(`<text x="${L}" y="${T - 9}" fill="${PAPER.muted}" font-size="8.5" ${MONO}>by how long the knot had been held (× resting flow)</text>`);
    a.flushes.forEach((fl, i) => {
      const cx = L + slot * (i + 0.5);
      const w = Math.min(26, slot * 0.55);
      const color = fl.holds_at_rest ? PAPER.release : fl.held_h === 0 ? PAPER.ink : PAPER.faint;
      const what = fl.held_h === 0
        ? 'a new knot: flow returns to rest'
        : fl.holds_at_rest
          ? `held ${hLabel(fl.held_h)}, set: it opens wide, to ${fl.peak_flow.toFixed(1)}× resting flow`
          : `held ${hLabel(fl.held_h)}, not yet set: it reopens narrowed, to ${fl.peak_flow.toFixed(2)}× resting flow`;
      out.push(`<g><title>${esc(what)}</title><rect x="${f1(cx - w / 2)}" y="${f1(Y(fl.peak_flow))}" width="${f1(w)}" height="${f1(B - Y(fl.peak_flow))}" fill="${color}" opacity="${fl.holds_at_rest ? 0.9 : 0.8}"/></g>`);
      out.push(`<text x="${f1(cx)}" y="${f1(Y(fl.peak_flow) - 5)}" text-anchor="middle" fill="${PAPER.text}" font-size="8.5" ${MONO}>${fl.peak_flow.toFixed(1)}</text>`);
      out.push(axisText(cx, B + 13, fl.held_h === 0 ? 'new' : hLabel(fl.held_h)));
    });
    out.push(`<line x1="${L}" x2="${R}" y1="${f1(Y(1))}" y2="${f1(Y(1))}" stroke="${PAPER.faint}" stroke-width="0.8" stroke-dasharray="1 3"/>`);
    out.push(`<text x="${R + 4}" y="${f1(Y(1) + 3)}" fill="${PAPER.faint}" font-size="8" ${MONO}>rest</text>`);
    out.push(axisText(R, B + 27, 'held for →', 'end'));
    const firstSet = a.flushes.findIndex((fl) => fl.holds_at_rest);
    if (firstSet > 0) {
      const xs = L + slot * firstSet;
      out.push(`<line x1="${f1(xs)}" x2="${f1(xs)}" y1="${T + 4}" y2="${B}" stroke="${PAPER.faint}" stroke-width="0.8" stroke-dasharray="2 3"/>`);
      out.push(`<text x="${f1(xs + 5)}" y="${T + 10}" fill="${PAPER.muted}" font-size="8" ${MONO}>set →</text>`);
      out.push(`<text x="${f1(xs - 5)}" y="${T + 10}" text-anchor="end" fill="${PAPER.muted}" font-size="8" ${MONO}>← not yet set</text>`);
    }
  }

  // Bottom right: how long a hold takes to set a knot, by how strong the hold is.
  {
    const L = 404;
    const R = L + 296;
    const T = 300;
    const B = 440;
    const X = (m: number) => L + ((m - 1.5) / 3.5) * (R - L);
    const Y = (h: number) => B - (Math.min(h, 3) / 3) * (B - T);
    out.push(frame(L, R, T, B));
    for (const h of [0, 1, 2, 3]) out.push(axisText(L - 6, Y(h) + 3, `${h} h`, 'end'));
    for (const m of [2, 3, 4, 5]) out.push(axisText(X(m), B + 13, `${m}×`));
    out.push(axisText(R, B + 27, 'tone that holds the knot, × rest →', 'end'));
    out.push(`<text x="${L}" y="${T - 22}" fill="${PAPER.text}" font-size="10" ${MONO}>how long until it sets</text>`);
    out.push(`<text x="${L}" y="${T - 9}" fill="${PAPER.muted}" font-size="8.5" ${MONO}>held at a steady tone; lower, it lets go at once</text>`);
    const walls = [
      { w: a.healthy, name: 'healthy walls', dash: '' },
      { w: a.hypertensive, name: 'hypertensive walls', dash: '5 3' },
    ];
    for (const { w, name, dash } of walls) {
      const pts = w.set_h.filter((r) => r.hours !== null).map((r) => [r.mult, r.hours as number] as const);
      // Below this tone the knot lets go at once: it cannot be held long enough to set.
      out.push(`<line x1="${f1(X(w.aopen_over_rest))}" x2="${f1(X(w.aopen_over_rest))}" y1="${T}" y2="${B}" stroke="${PAPER.knot}" stroke-width="0.8" stroke-dasharray="${dash || '1 0'}" opacity="0.45"/>`);
      out.push(`<path d="${pts.map(([m, h], i) => `${i ? 'L' : 'M'}${f1(X(m))} ${f1(Y(h))}`).join(' ')}" fill="none" stroke="${PAPER.knot}" stroke-width="1.8" stroke-dasharray="${dash}" stroke-linejoin="round"/>`);
      for (const [m, h] of pts) {
        out.push(`<g><title>${esc(`${name}: held at ${m}× resting tone, it sets after ${h.toFixed(1)} h`)}</title><circle cx="${f1(X(m))}" cy="${f1(Y(h))}" r="7" fill="transparent"/></g>`);
      }
      const [m0, h0] = pts[0];
      out.push(`<text x="${f1(X(m0) + 5)}" y="${f1(Y(h0) - 7)}" fill="${PAPER.text}" font-size="8.5" ${MONO}>${name}</text>`);
      out.push(`<text x="${f1(X(w.aopen_over_rest) + 4)}" y="${B - 6}" fill="${PAPER.muted}" font-size="8" ${MONO}>${w.aopen_over_rest.toFixed(1)}×</text>`);
    }
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="How a knot sets: a knot held for an hour lets go when stress ends, one held for three hours stays shut at rest; released, a set knot flushes; the stronger the hold, the sooner it sets">${out.join('')}</svg>`;
}
