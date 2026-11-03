/**
 * The perforator hypothesis in one drawing, for the position paper (/research/perforator-hypothesis/): one perforator
 * in section, three times over — open; held shut, a knot; letting go. Static, on paper, so it prints.
 *
 * Colours follow docs/DESIGN.md: the perforator is one neutral colour; terracotta is the knot and nothing else; jade is
 * release. Not to scale: the vessel is drawn many times wider than its fraction of a millimetre.
 */
const MONO = 'font-family="SF Mono, Menlo, Monaco, monospace"';
const SERIF = 'font-family="Georgia, serif"';

const C = {
  card: '#fbf7f0',
  text: '#3a3632',
  muted: '#8a7d6d',
  faint: '#b3a899',
  skin: '#f0dccb',
  skinEdge: '#d9c2ad',
  fat: '#f6ecdc',
  lobule: '#e8d9c2',
  glide: '#f8f3ea',
  sup: '#c9b9a3',
  deep: '#b29f88',
  muscle: '#efdcd2',
  fibre: '#e2c6b9',
  vessel: '#7f8f9c',
  lumen: '#dfe6ec',
  nerve: '#b59a4a',
  knot: '#c4452f',
  release: '#3f8f73',
};

const PW = 224; // panel width
const Y = { title: 14, skinTop: 40, skinBot: 50, sup: 128, deep: 160, bottom: 218 };
const f = (n: number) => n.toFixed(1);

type State = 'open' | 'held' | 'release';

function panel(x0: number, state: State, labels: boolean): string {
  const o: string[] = [];
  const L = x0 + 10;
  const R = x0 + PW - 10;
  const vx = x0 + 78; // the vessel
  const nx = vx + 15; // its nerve
  // Muscle, with its fibres.
  o.push(`<rect x="${L}" y="${Y.deep}" width="${R - L}" height="${Y.bottom - Y.deep}" fill="${C.muscle}"/>`);
  for (let i = 0; i < 4; i++) o.push(`<line x1="${L}" x2="${R}" y1="${Y.deep + 14 + i * 12}" y2="${Y.deep + 14 + i * 12}" stroke="${C.fibre}" stroke-width="0.7" stroke-dasharray="7 4"/>`);
  // The gliding layer between the fasciae: a web of small fluid-filled cells.
  o.push(`<rect x="${L}" y="${Y.sup}" width="${R - L}" height="${Y.deep - Y.sup}" fill="${C.glide}"/>`);
  for (let i = 0; i < 9; i++) {
    const cx = L + 8 + i * 23 + (i % 2) * 5;
    for (let j = 0; j < 2; j++) o.push(`<ellipse cx="${f(cx + j * 9)}" cy="${f(Y.sup + 9 + j * 13 + (i % 3) * 2)}" rx="6" ry="4.2" fill="none" stroke="${C.lobule}" stroke-width="0.6"/>`);
  }
  // Fat, in lobules.
  o.push(`<rect x="${L}" y="${Y.skinBot}" width="${R - L}" height="${Y.sup - Y.skinBot}" fill="${C.fat}"/>`);
  for (let i = 0; i < 7; i++) {
    const cx = L + 14 + i * 30 + (i % 2) * 7;
    const cy = Y.skinBot + 22 + (i % 3) * 22;
    o.push(`<ellipse cx="${cx}" cy="${cy}" rx="13" ry="10" fill="none" stroke="${C.lobule}" stroke-width="0.7"/>`);
  }
  // Skin.
  o.push(`<rect x="${L}" y="${Y.skinTop}" width="${R - L}" height="${Y.skinBot - Y.skinTop}" fill="${C.skin}"/>`);
  o.push(`<line x1="${L}" x2="${R}" y1="${Y.skinTop}" y2="${Y.skinTop}" stroke="${C.skinEdge}" stroke-width="1"/>`);
  // The two fasciae.
  o.push(`<line x1="${L}" x2="${R}" y1="${Y.sup}" y2="${Y.sup}" stroke="${C.sup}" stroke-width="1.3"/>`);
  o.push(`<rect x="${L}" y="${Y.deep - 1.8}" width="${R - L}" height="3.6" fill="${C.deep}"/>`);

  // The patch of skin this vessel feeds.
  const patch = { x: vx - 34, w: 84 };
  if (state === 'held') {
    o.push(`<rect x="${patch.x}" y="${Y.skinTop}" width="${patch.w}" height="${Y.skinBot - Y.skinTop}" fill="#ffffff" opacity="0.55"/>`);
  }
  if (state === 'release') {
    o.push(`<rect x="${patch.x}" y="${Y.skinTop}" width="${patch.w}" height="${Y.skinBot - Y.skinTop}" fill="${C.release}" opacity="0.16"/>`);
  }

  // The sleeve: the vessel's passage through the gliding layer.
  if (state === 'held') {
    o.push(`<rect x="${vx - 11}" y="${Y.sup}" width="22" height="${Y.deep - Y.sup}" rx="4" fill="#e3d6c3" stroke="${C.faint}" stroke-width="0.6"/>`);
    for (let k = 0; k < 7; k++) o.push(`<line x1="${vx - 11}" x2="${vx + 11}" y1="${Y.sup + 3 + k * 4.4}" y2="${Y.sup + 7 + k * 4.4}" stroke="${C.faint}" stroke-width="0.5"/>`);
  } else {
    o.push(`<rect x="${vx - 11}" y="${Y.sup}" width="22" height="${Y.deep - Y.sup}" rx="4" fill="#eef3f1" stroke="${C.lobule}" stroke-width="0.6"/>`);
  }

  // The nerve, travelling with the vessel through the same opening, branching in the skin.
  const nerve = `M${nx} ${Y.bottom} L${nx} ${Y.deep} L${nx + 3} ${Y.sup} L${nx + 12} ${Y.skinBot + 4}`;
  o.push(`<path d="${nerve}" fill="none" stroke="${C.nerve}" stroke-width="${state === 'release' ? 1.4 : 1}" opacity="${state === 'held' ? 0.55 : 0.9}"/>`);
  for (const dx of [-10, 4, 18]) o.push(`<path d="M${nx + 12} ${Y.skinBot + 4} L${nx + 12 + dx} ${Y.skinTop + 3}" fill="none" stroke="${C.nerve}" stroke-width="0.7" opacity="${state === 'held' ? 0.5 : 0.85}"/>`);

  // The vessel: below the opening it always carries blood; above it, open or shut.
  const wall = (x: number, y1: number, y2: number, op = 1) => `<line x1="${f(x)}" x2="${f(x)}" y1="${y1}" y2="${y2}" stroke="${C.vessel}" stroke-width="1.3" opacity="${op}"/>`;
  o.push(`<rect x="${vx - 4}" y="${Y.deep}" width="8" height="${Y.bottom - Y.deep}" fill="${C.lumen}"/>`);
  o.push(wall(vx - 4, Y.deep, Y.bottom), wall(vx + 4, Y.deep, Y.bottom));
  const branches = [
    [-30, -4],
    [22, -6],
    [42, -2],
  ];
  if (state === 'held') {
    // Shut at the opening: the walls meet; above, an empty, collapsed vessel.
    o.push(`<path d="M${vx - 4} ${Y.deep + 6} L${vx} ${Y.deep - 3} L${vx + 4} ${Y.deep + 6}" fill="none" stroke="${C.vessel}" stroke-width="1.3"/>`);
    o.push(`<line x1="${vx}" x2="${vx}" y1="${Y.deep - 3}" y2="${Y.skinBot + 6}" stroke="${C.vessel}" stroke-width="1" opacity="0.45"/>`);
    for (const [dx] of branches) o.push(`<path d="M${vx} ${Y.skinBot + 8} Q ${f(vx + dx * 0.4)} ${Y.skinBot + 2} ${vx + dx} ${Y.skinTop + 4}" fill="none" stroke="${C.vessel}" stroke-width="0.7" opacity="0.3"/>`);
    // The knot.
    o.push(`<circle cx="${vx}" cy="${Y.deep}" r="12" fill="${C.knot}" opacity="0.14"/>`);
    o.push(`<circle cx="${vx}" cy="${Y.deep}" r="4.6" fill="${C.knot}"/>`);
  } else {
    o.push(`<rect x="${vx - 3.4}" y="${Y.skinBot + 8}" width="6.8" height="${Y.deep - Y.skinBot - 8}" fill="${C.lumen}"/>`);
    o.push(wall(vx - 3.4, Y.skinBot + 8, Y.deep), wall(vx + 3.4, Y.skinBot + 8, Y.deep));
    for (const [dx] of branches) o.push(`<path d="M${vx} ${Y.skinBot + 8} Q ${f(vx + dx * 0.4)} ${Y.skinBot + 2} ${vx + dx} ${Y.skinTop + 4}" fill="none" stroke="${C.vessel}" stroke-width="1"/>`);
  }
  if (state === 'release') {
    // Blood floods the patch; its nerve fires: the spark.
    for (let k = 0; k < 4; k++) o.push(`<circle cx="${vx}" cy="${Y.deep - 10 - k * 22}" r="1.6" fill="${C.release}" opacity="0.85"/>`);
    const star = (cx: number, cy: number, r: number) =>
      `<path d="M${f(cx - r)} ${f(cy)} L${f(cx + r)} ${f(cy)} M${f(cx)} ${f(cy - r)} L${f(cx)} ${f(cy + r)} M${f(cx - r * 0.65)} ${f(cy - r * 0.65)} L${f(cx + r * 0.65)} ${f(cy + r * 0.65)} M${f(cx - r * 0.65)} ${f(cy + r * 0.65)} L${f(cx + r * 0.65)} ${f(cy - r * 0.65)}" stroke="${C.release}" stroke-width="0.9"/>`;
    for (const [dx, r] of [
      [-18, 3.6],
      [2, 4.6],
      [20, 3.4],
      [36, 4],
    ])
      o.push(star(nx + dx, Y.skinTop - 9, r));
  }

  // Titles and notes.
  const title = { open: 'a · open', held: 'b · held shut: a knot', release: 'c · letting go' }[state];
  o.push(`<text x="${L}" y="${Y.title}" fill="${C.text}" font-size="9.5" font-weight="700" font-family="system-ui, -apple-system, sans-serif">${title}</text>`);
  const note = (x: number, y: number, t: string, color = C.muted, anchor = 'start') =>
    o.push(`<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" fill="${color}" font-size="7.4" ${MONO}>${t}</text>`);
  if (labels) {
    note(R - 3, Y.skinBot - 2.5, 'skin', C.muted, 'end');
    note(R - 3, Y.skinBot + 60, 'fat', C.muted, 'end');
    note(R - 3, Y.sup - 3, 'superficial fascia', C.muted, 'end');
    note(R - 3, Y.sup + 18, 'gliding layer', C.muted, 'end');
    note(R - 3, Y.deep + 12, 'deep fascia', C.muted, 'end');
    note(R - 3, Y.bottom - 6, 'muscle', C.muted, 'end');
    note(vx - 8, Y.bottom - 6, 'artery', C.muted, 'end');
    note(nx + 4, Y.bottom - 6, 'nerve');
  }
  if (state === 'held') {
    note(vx + 18, Y.deep + 16, 'the wall holds', C.knot);
    note(vx + 18, Y.deep + 25, 'itself shut', C.knot);
    note(vx + 16, Y.sup + 13, 'its sleeve dries,');
    note(vx + 16, Y.sup + 22, 'and can jam');
    note(vx + 52, Y.skinBot + 14, 'its patch');
    note(vx + 52, Y.skinBot + 23, 'is underfed');
  }
  if (state === 'release') {
    note(vx + 18, Y.deep + 16, 'tone falls below', C.release);
    note(vx + 18, Y.deep + 25, 'the band: it opens', C.release);
    note(vx + 16, Y.sup + 13, 'blood floods');
    note(vx + 16, Y.sup + 22, 'the patch');
    note(vx + 52, Y.skinBot + 14, 'its nerve fires:');
    note(vx + 52, Y.skinBot + 23, 'a tingle');
  }
  return o.join('');
}

export function perforatorFigure(): string {
  const W = PW * 3 + 8;
  const H = Y.bottom + 22;
  const parts = [
    `<rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="${C.card}"/>`,
    panel(4, 'open', true),
    panel(4 + PW, 'held', false),
    panel(4 + PW * 2, 'release', false),
    `<text x="${W - 10}" y="${H - 6}" text-anchor="end" fill="${C.faint}" font-size="7" ${SERIF} font-style="italic">not to scale: the artery is a fraction of a millimetre across</text>`,
  ];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="A perforator in section, three times: open, with a small artery and its nerve rising through an opening in the deep fascia and a sleeve through the gliding layer; held shut at the opening, a knot, its sleeve dry and its patch of skin underfed; and letting go, blood flooding the patch and its nerve firing.">${parts.join('')}</svg>`;
}
