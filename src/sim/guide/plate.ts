/**
 * Beneath: a cross-section of the knot at the spot, one per theory, animated by its model's own states (the film's
 * `focal`). Skin, fat, the fascia and muscle, as in the introduction's plate; then what the theory says is there: a small
 * artery rising through its ring, a contraction knot on a taut band, one motor unit's fibres and the neuron that holds
 * them, or quiet tissue and a body map. Plain SVG, set up once and moved by attribute.
 */
import { INKC } from './patch';

const MONO = 'font-family="SF Mono, Menlo, Monaco, monospace"';
const W = 360;
const H = 228;
const Y = { skin: 12, fat: 64, sup: 70, loose: 84, deep: 90, bottom: 218 };

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};

function layers(): string {
  const lobules = Array.from({ length: 16 }, (_, i) => {
    const x = 14 + ((i * 53) % 300);
    const y = 26 + ((i * 17) % 30);
    return `<ellipse cx="${x}" cy="${y}" rx="${9 + (i % 3) * 2}" ry="${6 + (i % 2) * 2}" fill="none" stroke="${rgba(INKC.ivory, 0.07)}" stroke-width="0.8"/>`;
  }).join('');
  const fibres = Array.from({ length: 16 }, (_, i) => {
    const y = Y.deep + 8 + i * 7.6;
    return `<path d="M0 ${y.toFixed(1)} C 90 ${(y - 1.5).toFixed(1)} 180 ${(y + 1.5).toFixed(1)} 270 ${(y - 1).toFixed(1)} S ${W - 40} ${(y + 1).toFixed(1)} ${W} ${y.toFixed(1)}" fill="none" stroke="${rgba(INKC.ivory, 0.05)}" stroke-width="1"/>`;
  }).join('');
  const label = (y: number, t: string) => `<text x="${W - 4}" y="${y}" text-anchor="end" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}">${t}</text>`;
  return `
    <rect x="0" y="0" width="${W}" height="${Y.skin}" fill="${rgba(INKC.ivory, 0.07)}"/>
    <rect x="0" y="${Y.skin}" width="${W}" height="${Y.fat - Y.skin}" fill="${rgba(INKC.ochre, 0.035)}"/>${lobules}
    <line x1="0" x2="${W}" y1="${Y.sup}" y2="${Y.sup}" stroke="${rgba(INKC.ivory, 0.22)}" stroke-width="1"/>
    <rect x="0" y="${Y.sup}" width="${W}" height="${Y.loose - Y.sup}" fill="${rgba(INKC.vessel, 0.03)}"/>
    <rect x="0" y="${Y.loose}" width="${W}" height="${Y.deep - Y.loose}" fill="${rgba(INKC.ivory, 0.14)}"/>
    <rect x="0" y="${Y.deep}" width="${W}" height="${Y.bottom - Y.deep}" fill="${rgba(INKC.knot, 0.03)}"/>${fibres}
    ${label(Y.skin - 3, 'skin')}${label(Y.fat - 4, 'fat')}${label(Y.sup - 2, 'superficial fascia')}${label(Y.deep - 1, 'deep fascia')}${label(Y.bottom - 4, 'muscle')}`;
}

export type PlateState = Record<string, number>;

export interface Plate {
  svg: string;
  update(root: SVGSVGElement, s: PlateState, cue: { hand: boolean; attend: boolean }): void;
}

const svgWrap = (inner: string, id: string) =>
  `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${id}: beneath the spot" class="plate-svg">${layers()}${inner}</svg>`;

const q = (root: SVGSVGElement, sel: string) => root.querySelector(sel) as SVGElement | null;
const set = (el: SVGElement | null, attrs: Record<string, string | number>) => {
  if (!el) return;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
};

/** Perforators: the small artery rising through its ring in the deep fascia, its lumen and flow from the run; around it
 * where it crosses the gliding plane, its sleeve of sliding tissue, which thickens and pins the layers as it jams. */
const t1: Plate = {
  svg: svgWrap(
    `<g id="p-patch"><ellipse cx="180" cy="${Y.skin + 12}" rx="70" ry="16" fill="${INKC.knot}" opacity="0"/></g>
     <rect id="p-sleeve" x="156" y="${Y.sup - 3}" width="48" height="${Y.deep - Y.sup + 6}" rx="9" fill="${rgba(INKC.ivory, 0.04)}" stroke="${rgba(INKC.ivory, 0.25)}" stroke-width="1" stroke-dasharray="2 2"/>
     <text x="${156 - 4}" y="${Y.sup + 8}" text-anchor="end" ${MONO} font-size="7" fill="${rgba(INKC.stone, 0.9)}">its sleeve</text>
     <rect id="p-wall" x="171" y="${Y.skin + 4}" width="18" height="${Y.bottom - Y.skin - 4}" rx="3" fill="${rgba(INKC.vessel, 0.2)}"/>
     <rect id="p-lumen" x="175" y="${Y.skin + 4}" width="10" height="${Y.bottom - Y.skin - 4}" rx="2" fill="${rgba(INKC.vessel, 0.55)}"/>
     <line id="p-flow" x1="180" x2="180" y1="${Y.bottom}" y2="${Y.skin + 6}" stroke="${INKC.ivory}" stroke-width="1.4" stroke-dasharray="2 9" opacity="0.6"/>
     <path id="p-nerve" d="M 196 ${Y.bottom} C 198 150 194 110 196 ${Y.deep} S 200 40 214 ${Y.skin + 8}" fill="none" stroke="${rgba(INKC.ivory, 0.35)}" stroke-width="1.2"/>
     <ellipse id="p-ring" cx="180" cy="${(Y.loose + Y.deep) / 2}" rx="17" ry="6" fill="none" stroke="${rgba(INKC.ivory, 0.35)}" stroke-width="1.2"/>
     <ellipse id="p-knot" cx="180" cy="${(Y.loose + Y.deep) / 2}" rx="22" ry="9" fill="${INKC.knot}" opacity="0"/>
     <text x="8" y="${H - 4}" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}" id="p-read"></text>`,
    'Perforators',
  ),
  update(root, s) {
    const lumen = Math.max(0, Math.min(s.lumen ?? 1, 1.3));
    const w = 1 + 11 * lumen;
    set(q(root, '#p-lumen'), { x: 180 - w / 2, width: w, fill: rgba(INKC.vessel, 0.25 + 0.4 * Math.min(lumen, 1)) });
    const flow = Math.pow(lumen / 0.75, 4);
    const el = q(root, '#p-flow');
    if (el) {
      const off = (parseFloat(el.getAttribute('data-off') ?? '0') + Math.min(flow, 3) * 1.6) % 11;
      set(el, { 'stroke-dashoffset': off.toFixed(2), 'data-off': off.toFixed(2), opacity: (0.7 * Math.min(flow, 1)).toFixed(2) });
    }
    const held = lumen < 0.25 ? 1 : 0;
    set(q(root, '#p-knot'), { opacity: (0.55 * held).toFixed(2) });
    set(q(root, '#p-patch ellipse'), { opacity: (0.16 * Math.min((s.debt ?? 0) / 0.3, 1)).toFixed(2) });
    const nerve = Math.min((s.nerve ?? 0) / 0.08, 1);
    set(q(root, '#p-nerve'), { stroke: nerve > 0.05 ? rgba(INKC.spark, 0.35 + 0.6 * nerve) : rgba(INKC.ivory, 0.35) });
    const sleeve = Math.min(Math.max(s.sleeve ?? 0, 0), 1);
    const jam = sleeve > 0.55;
    set(q(root, '#p-sleeve'), {
      fill: rgba(INKC.ivory, 0.04 + 0.22 * sleeve),
      stroke: rgba(INKC.ivory, jam ? 0.6 : 0.25),
      'stroke-dasharray': jam ? 'none' : '2 2',
    });
    const r = q(root, '#p-read');
    if (r) r.textContent = `lumen ${(100 * lumen).toFixed(0)}% of rest · tone ${(s.tone ?? 0).toFixed(2)} · sleeve ${sleeve.toFixed(2)}${jam ? ' (stuck)' : ''} · water ${(s.water ?? 1).toFixed(2)}`;
  },
};

/** Trigger points: a taut band in the muscle with its contraction knot, capillaries squeezed around it. */
const t3: Plate = {
  svg: svgWrap(
    `<g id="p-band">${[0, 1, 2, 3, 4].map((i) => `<path d="M 30 ${150 + i * 5} C 120 ${150 + i * 5} 240 ${150 + i * 5} 330 ${150 + i * 5}" fill="none" stroke="${rgba(INKC.ivory, 0.18)}" stroke-width="1.2"/>`).join('')}</g>
     <ellipse id="p-milieu" cx="180" cy="160" rx="70" ry="30" fill="${INKC.ochre}" opacity="0"/>
     <ellipse id="p-node" cx="180" cy="160" rx="22" ry="10" fill="${INKC.knot}" opacity="0"/>
     <g id="p-caps">${Array.from({ length: 10 }, (_, i) => `<circle cx="${130 + (i % 5) * 25}" cy="${i < 5 ? 132 : 188}" r="2.2" fill="${INKC.vessel}"/>`).join('')}</g>
     <text x="8" y="${H - 4}" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}" id="p-read"></text>`,
    'Trigger points',
  ),
  update(root, s) {
    const c = s.contracture ?? 0;
    set(q(root, '#p-node'), { rx: (8 + 26 * c).toFixed(1), ry: (3 + 10 * c).toFixed(1), opacity: (0.15 + 0.7 * c).toFixed(2) });
    root.querySelectorAll('#p-band path').forEach((p, i) => {
      const dy = (i - 2) * (1 - 0.6 * c) * 5;
      p.setAttribute('d', `M 30 ${160 + dy * 1.2} C 120 ${160 + dy} 240 ${160 + dy} 330 ${160 + dy * 1.2}`);
      p.setAttribute('stroke', c > 0.5 ? rgba(INKC.knot, 0.25 + 0.3 * c) : rgba(INKC.ivory, 0.18));
    });
    set(q(root, '#p-milieu'), { opacity: (0.22 * (s.milieu ?? 0)).toFixed(2) });
    set(q(root, '#p-caps'), { opacity: (0.15 + 0.6 * (s.capillary_flow ?? 1)).toFixed(2) });
    const r = q(root, '#p-read');
    if (r) r.textContent = `contracture ${c.toFixed(2)} · energy ${(s.energy ?? 0).toFixed(2)} · acid milieu ${(s.milieu ?? 0).toFixed(2)}`;
  },
};

/** The motor switch: one unit's fibres scattered in the muscle, and beside them the spinal cord with the motor neuron. */
const fibresOfOne = Array.from({ length: 12 }, (_, i) => {
  const x = 150 + ((i * 37) % 170);
  const y = Y.deep + 22 + ((i * 29) % 96);
  return `<line x1="${x}" x2="${x + 44}" y1="${y}" y2="${y + ((i % 3) - 1)}" stroke-linecap="round"/>`;
}).join('');
const t7: Plate = {
  svg: svgWrap(
    `<g id="p-cord" transform="translate(58 150)">
       <ellipse rx="38" ry="30" fill="${rgba(INKC.ivory, 0.05)}" stroke="${rgba(INKC.ivory, 0.25)}"/>
       <path d="M -22 -10 C -10 -22 -4 -8 0 -4 C 4 -8 10 -22 22 -10 C 14 0 18 12 24 18 C 10 16 4 6 0 4 C -4 6 -10 16 -24 18 C -18 12 -14 0 -22 -10 Z" fill="${rgba(INKC.ivory, 0.12)}"/>
       <ellipse id="p-mono" rx="46" ry="37" fill="none" stroke="${INKC.ochre}" stroke-width="2" opacity="0"/>
       <circle id="p-neuron" cx="16" cy="12" r="4" fill="${INKC.ivory}"/>
       <circle id="p-inhib" cx="16" cy="12" r="9" fill="none" stroke="${INKC.spark}" stroke-width="1.2" stroke-dasharray="2 2" opacity="0"/>
       <text x="0" y="46" text-anchor="middle" ${MONO} font-size="7" fill="${rgba(INKC.stone, 0.9)}">spinal cord</text>
     </g>
     <path id="p-axon" d="M 78 162 C 110 170 120 150 150 150" fill="none" stroke="${rgba(INKC.ivory, 0.3)}" stroke-width="1.2" stroke-dasharray="3 3"/>
     <g id="p-fibres" stroke="${rgba(INKC.ivory, 0.2)}" stroke-width="2.4">${fibresOfOne}</g>
     <ellipse id="p-metab" cx="235" cy="160" rx="90" ry="45" fill="${INKC.ochre}" opacity="0"/>
     <text x="8" y="${H - 4}" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}" id="p-read"></text>`,
    'Motor switch',
  ),
  update(root, s, cue) {
    const on = (s.firing ?? 0) > 0.5;
    const latched = on && (s.drive ?? 0) < 1;
    const col = latched ? INKC.knot : INKC.ivory;
    const flick = 0.8 + 0.2 * Math.sin(performance.now() * 0.0565);
    set(q(root, '#p-fibres'), { stroke: on ? rgba(col, (latched ? 0.85 : 0.5) * flick) : rgba(INKC.ivory, 0.16) });
    set(q(root, '#p-neuron'), { fill: on ? col : rgba(INKC.ivory, 0.4), r: on ? 5 : 4 });
    set(q(root, '#p-axon'), { stroke: on ? rgba(col, 0.6) : rgba(INKC.ivory, 0.25), 'stroke-dashoffset': on ? ((performance.now() * 0.03) % 6).toFixed(1) : 0 });
    set(q(root, '#p-mono'), { opacity: (0.6 * Math.min(s.facilitation ?? 0, 1)).toFixed(2) });
    set(q(root, '#p-inhib'), { opacity: cue.attend || cue.hand ? 0.9 : 0 });
    set(q(root, '#p-metab'), { opacity: (0.18 * Math.min((s.metabolites ?? 0) / 0.8, 1)).toFixed(2) });
    const r = q(root, '#p-read');
    if (r) r.textContent = `${on ? (latched ? 'latched on: held by its own currents' : 'firing on its drive') : 'silent'} · drive ${(s.drive ?? 0).toFixed(2)} of threshold · metabolites ${(s.metabolites ?? 0).toFixed(2)}`;
  },
};

/** Perception: the tissue quiet; beside it, the place on the body map and how loudly it is felt. */
const t6: Plate = {
  svg: svgWrap(
    `<g transform="translate(248 120)">
       <rect x="-54" y="-44" width="108" height="88" rx="8" fill="${rgba(INKC.ivory, 0.04)}" stroke="${rgba(INKC.ivory, 0.2)}"/>
       ${Array.from({ length: 16 }, (_, i) => `<circle cx="${-39 + (i % 4) * 26}" cy="${-30 + Math.floor(i / 4) * 20}" r="7" fill="none" stroke="${rgba(INKC.stone, 0.3)}" stroke-dasharray="1.5 2"/>`).join('')}
       <circle id="p-place" cx="13" cy="-10" r="9" fill="${INKC.knot}" opacity="0"/>
       <circle id="p-att" cx="13" cy="-10" r="13" fill="none" stroke="${INKC.spark}" stroke-dasharray="3 2" opacity="0"/>
       <text x="0" y="58" text-anchor="middle" ${MONO} font-size="7" fill="${rgba(INKC.stone, 0.9)}">the body map</text>
     </g>
     <text x="70" y="160" text-anchor="middle" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.8)}">the tissue: unchanged</text>
     <rect id="p-arousal" x="170" y="208" width="0" height="4" rx="2" fill="${INKC.ochre}" opacity="0.7"/>
     <text x="8" y="${H - 4}" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}" id="p-read"></text>`,
    'Perception',
  ),
  update(root, s, cue) {
    const felt = s.felt ?? 0;
    set(q(root, '#p-place'), { opacity: Math.min(Math.max((felt - 0.6) / 0.8, 0), 1).toFixed(2), r: (6 + 6 * Math.min(felt, 1.5)).toFixed(1) });
    set(q(root, '#p-att'), { opacity: cue.attend || cue.hand ? 0.8 : 0 });
    set(q(root, '#p-arousal'), { width: (120 * Math.min(Math.max(s.arousal ?? 0, 0), 1.2)).toFixed(1) });
    const r = q(root, '#p-read');
    if (r) r.textContent = `felt ${felt.toFixed(2)} (1: felt as a knot) · gain ${(s.gain ?? 1).toFixed(2)} · arousal ${(s.arousal ?? 0).toFixed(2)}`;
  },
};

/** Vascular latch: a region's small arteries, in the skin and in the muscle, in cross-section: their lumens narrow as the
 * region clamps; held, they are the knot. The clamped region is shadowed (cut off from awareness); awareness reaches it
 * from above; the held prediction is a gauge. */
const vessel = (id: string, cx: number, cy: number, r: number) =>
  `<circle id="p-w${id}" cx="${cx}" cy="${cy}" r="${r}" fill="${rgba(INKC.vessel, 0.16)}" stroke="${rgba(INKC.vessel, 0.5)}" stroke-width="2"/>
   <circle id="p-l${id}" cx="${cx}" cy="${cy}" r="${(0.62 * r).toFixed(1)}" fill="${rgba(INKC.vessel, 0.55)}"/>`;
const t2: Plate = {
  svg: svgWrap(
    `<ellipse id="p-numb" cx="185" cy="98" rx="120" ry="66" fill="#000" opacity="0"/>
     <path id="p-beam" d="M 186 0 C 176 34 196 70 186 110 S 176 140 214 146" fill="none" stroke="${INKC.spark}" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.15"/>
     ${vessel('a', 150, 40, 8)}
     ${vessel('b', 232, 150, 10)}
     <g transform="translate(12 ${Y.deep + 16})">
       <text x="0" y="0" ${MONO} font-size="7" fill="${rgba(INKC.stone, 0.9)}">the held prediction</text>
       <rect x="0" y="5" width="64" height="4" rx="2" fill="${rgba(INKC.ivory, 0.08)}"/>
       <rect id="p-pred" x="0" y="5" width="0" height="4" rx="2" fill="${INKC.knot}"/>
     </g>
     <text x="8" y="${H - 4}" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}" id="p-read"></text>`,
    'Vascular latch',
  ),
  update(root, s) {
    const c = s.held_prediction ?? 0;
    const f = s.clamp ?? 0.2;
    const e = s.awareness ?? 0;
    const held = c > 0.5 && f > 0.5;
    const squeeze = 1 - 0.75 * Math.max(0, Math.min((f - 0.2) / 0.8, 1));
    for (const [id, r] of [['a', 8], ['b', 10]] as const) {
      set(q(root, `#p-l${id}`), { r: (0.62 * r * squeeze).toFixed(2) });
      set(q(root, `#p-w${id}`), held
        ? { fill: rgba(INKC.knot, 0.3 + 0.4 * f), stroke: rgba(INKC.knot, 0.9) }
        : { fill: rgba(INKC.vessel, 0.16), stroke: rgba(INKC.vessel, 0.5) });
    }
    set(q(root, '#p-pred'), { width: (64 * c).toFixed(1), fill: c > 0.5 ? INKC.knot : rgba(INKC.stone, 0.8) });
    set(q(root, '#p-beam'), { opacity: (0.12 + 0.85 * Math.min(e / 0.6, 1)).toFixed(2) });
    set(q(root, '#p-numb'), { opacity: (0.4 * Math.max(0, f - 0.5) * 2 * (1 - Math.min(e / 0.5, 1))).toFixed(2) });
    const r = q(root, '#p-read');
    if (r) r.textContent = `prediction ${c > 0.5 ? 'held' : 'let go'} (${c.toFixed(2)}) · clamp ${f.toFixed(2)} · awareness ${e.toFixed(2)}`;
  },
};

/** Densification: the gliding layer between the superficial and deep fascia, its structure drawn as short strokes that
 * thicken and clump as it builds; above it, the layers sliding, or not. */
const CHAINS = Array.from({ length: 34 }, (_, i) => {
  const x = 8 + i * 10.4 + ((i * 7) % 5);
  const y = Y.sup + 3 + ((i * 5) % 9);
  const dx = 4 + ((i * 3) % 4);
  return `<path id="p-c${i}" d="M ${x.toFixed(1)} ${y} q ${(dx / 2).toFixed(1)} ${i % 2 ? -3 : 3} ${dx} 0" fill="none" stroke="${rgba(INKC.ivory, 0.2)}" stroke-width="0.8"/>`;
}).join('');
const t4: Plate = {
  svg: svgWrap(
    `<rect id="p-jam" x="40" y="${Y.sup}" width="280" height="${Y.loose - Y.sup}" fill="${INKC.knot}" opacity="0"/>
     ${CHAINS}
     <line id="p-slide" x1="110" x2="250" y1="${Y.sup - 7}" y2="${Y.sup - 7}" stroke="${INKC.ivory}" stroke-width="1.2" stroke-dasharray="6 6" opacity="0.6"/>
     <path d="M 250 ${Y.sup - 10} L 256 ${Y.sup - 7} L 250 ${Y.sup - 4}" fill="none" stroke="${rgba(INKC.ivory, 0.5)}" stroke-width="1" id="p-arrow"/>
     <text x="112" y="${Y.sup - 12}" ${MONO} font-size="7" fill="${rgba(INKC.stone, 0.9)}">the layers sliding</text>
     <text x="8" y="${H - 4}" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}" id="p-read"></text>`,
    'Densification',
  ),
  update(root, s) {
    const x = Math.min(Math.max(s.structure ?? 0, 0), 1);
    const slide = Math.min(Math.max(s.sliding ?? 1, 0), 1.2);
    const stuck = x * (1 - Math.min(slide, 1)) > 0.4;
    for (let i = 0; i < 34; i++)
      set(q(root, `#p-c${i}`), {
        'stroke-width': (0.6 + 2.2 * x).toFixed(2),
        stroke: stuck ? rgba(INKC.knot, 0.35 + 0.5 * x) : rgba(INKC.ivory, 0.12 + 0.5 * x),
      });
    set(q(root, '#p-jam'), { opacity: stuck ? (0.12 + 0.2 * x).toFixed(2) : 0 });
    const el = q(root, '#p-slide');
    if (el) {
      const off = (parseFloat(el.getAttribute('data-off') ?? '0') - 1.4 * Math.min(slide, 1.2)) % 12;
      set(el, { 'stroke-dashoffset': off.toFixed(2), 'data-off': off.toFixed(2), opacity: (0.15 + 0.6 * Math.min(slide, 1)).toFixed(2) });
    }
    set(q(root, '#p-arrow'), { opacity: (0.15 + 0.6 * Math.min(slide, 1)).toFixed(2) });
    const r = q(root, '#p-read');
    if (r) r.textContent = `structure ${x.toFixed(2)} · sliding ${slide.toFixed(2)} of a free layer's · warmth +${(s.warmth ?? 0).toFixed(1)} °C`;
  },
};

/** Nerves: a nerve of the skin rising through its ring in the deep fascia beside the perforator it travels with, its
 * firing as impulses along it, its branches through the skin above. */
const BRANCH = [
  'M 204 18 C 180 14 150 16 118 12',
  'M 204 18 C 226 12 256 16 290 10',
  'M 204 18 C 214 26 236 30 262 32',
];
const t5: Plate = {
  svg: svgWrap(
    `<path d="M 188 ${Y.bottom} C 186 160 190 120 188 ${Y.deep} S 184 50 192 ${Y.skin + 6}" fill="none" stroke="${rgba(INKC.vessel, 0.3)}" stroke-width="3.5"/>
     <path d="M 200 ${Y.bottom} C 198 160 202 120 200 ${Y.deep} S 196 60 204 18" fill="none" stroke="${rgba(INKC.ivory, 0.12)}" stroke-width="4"/>
     <path id="p-nerve" d="M 200 ${Y.bottom} C 198 160 202 120 200 ${Y.deep} S 196 60 204 18" fill="none" stroke="${rgba(INKC.ivory, 0.45)}" stroke-width="1.3"/>
     <path id="p-imp" d="M 200 ${Y.bottom} C 198 160 202 120 200 ${Y.deep} S 196 60 204 18" fill="none" stroke="${INKC.ivory}" stroke-width="2.2" stroke-dasharray="2 12" opacity="0"/>
     ${BRANCH.map((d, i) => `<path id="p-br${i}" d="${d}" fill="none" stroke="${rgba(INKC.ivory, 0.25)}" stroke-width="0.9"/>`).join('')}
     <ellipse cx="196" cy="${(Y.loose + Y.deep) / 2}" rx="15" ry="5" fill="none" stroke="${rgba(INKC.ivory, 0.35)}" stroke-width="1.2"/>
     <ellipse id="p-knot" cx="198" cy="${(Y.loose + Y.deep) / 2}" rx="20" ry="8" fill="${INKC.knot}" opacity="0"/>
     <text x="8" y="${H - 4}" ${MONO} font-size="7.5" fill="${rgba(INKC.stone, 0.9)}" id="p-read"></text>`,
    'Nerves',
  ),
  update(root, s) {
    const own = s.firing ?? 0;
    const pressed = s.pressed ?? 0;
    const total = own + pressed;
    const el = q(root, '#p-imp');
    if (el) {
      const off = (parseFloat(el.getAttribute('data-off') ?? '0') + 2.4 * Math.min(total, 3)) % 14;
      set(el, { 'stroke-dashoffset': off.toFixed(2), 'data-off': off.toFixed(2), opacity: Math.min(0.15 + 0.5 * total, 0.9).toFixed(2) });
    }
    set(q(root, '#p-knot'), { opacity: own > 1 ? 0.55 : 0 });
    for (let i = 0; i < BRANCH.length; i++)
      set(q(root, `#p-br${i}`), pressed > 0.05 && total >= 2
        ? { stroke: rgba(INKC.spark, 0.85), 'stroke-dasharray': '2 4' }
        : { stroke: rgba(INKC.ivory, 0.25), 'stroke-dasharray': 'none' });
    const r = q(root, '#p-read');
    if (r) r.textContent = `firing ${own.toFixed(2)} (1: felt) · pressed +${pressed.toFixed(2)} · sympathetic ${(s.sympathetic ?? 0).toFixed(2)}`;
  },
};

export const PLATES: Record<string, Plate> = { T1: t1, T2: t2, T3: t3, T4: t4, T5: t5, T6: t6, T7: t7 };
