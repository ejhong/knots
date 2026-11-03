/**
 * The clocks, for the position paper (/research/perforator-hypothesis/): how fast knots are reported to change, beside
 * how fast the physiology the hypothesis names is measured to change, on one logarithmic axis from a second to a year.
 * The measured spans come from the cited papers and the project's warming check (passed in); the reported spans are
 * rough, from practitioners' accounts. Where only two moments were measured (arterioles held five minutes and four hours), the
 * row shows two dots joined by a dashed line rather than a span. Static, on paper, so it prints. Colours as in perforatorFigure.ts: knots are
 * terracotta and nothing else; the vessel's physiology is the perforator's neutral slate.
 */
const MONO = 'font-family="SF Mono, Menlo, Monaco, monospace"';
const SERIF = 'font-family="Georgia, serif"';

const C = {
  card: '#fbf7f0',
  text: '#3a3632',
  muted: '#8a7d6d',
  faint: '#d8cdbd',
  vessel: '#7f8f9c',
  knot: '#c4452f',
  fascia: '#a8957c',
};

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 7 * DAY;
const MONTH = 30.4 * DAY;
const YEAR = 365 * DAY;

export interface ClockInputs {
  /** The warming check: a patch of skin's time constant at maximal flow, and at a tenth of it (s). */
  warmFast: number;
  warmSlow: number;
}

type Row = {
  label: string;
  from: number;
  to: number;
  kind: 'measured' | 'knot' | 'fascia';
  ends?: [string, string];
  dot?: number;
  /** Two measured moments, not a span: a dot at each end, joined by a dashed line. */
  pair?: boolean;
};

export function clocksFigure({ warmFast, warmSlow }: ClockInputs): string {
  const W = 680;
  const x0 = 236; // the axis starts here; labels sit to its left
  const x1 = W - 22;
  const lo = 0; // log10 of 1 s
  const hi = Math.log10(YEAR);
  const X = (t: number) => x0 + ((Math.log10(t) - lo) / (hi - lo)) * (x1 - x0);
  const f = (n: number) => n.toFixed(1);

  const measured: Row[] = [
    { label: 'a deep breath narrows the skin’s vessels', from: 3.6, to: 34, kind: 'measured', dot: 5 },
    { label: 'a reopened vessel’s flow peaks', from: 1, to: 11, kind: 'measured', dot: 11 },
    { label: 'a patch of skin warms', from: warmFast, to: warmSlow, kind: 'measured' },
    { label: 'a constricted arteriole’s muscle adapts', from: 5 * MIN, to: 4 * HOUR, kind: 'measured', ends: ['no trace', 'incomplete'], pair: true },
    { label: 'a constricted artery remodels inward', from: 3 * DAY, to: 3 * DAY, kind: 'measured', dot: 3 * DAY },
  ];
  const reported: Row[] = [
    { label: 'a knot lets go', from: 2, to: 15, kind: 'knot' },
    { label: 'a hot shower softens many', from: 3 * MIN, to: 15 * MIN, kind: 'knot' },
    { label: 'a fresh knot yields', from: 10 * MIN, to: HOUR, kind: 'knot' },
    { label: 'an old knot yields', from: MONTH, to: 6 * MONTH, kind: 'knot' },
    { label: 'slower changes in the fascia', from: DAY, to: 3 * WEEK, kind: 'fascia' },
  ];

  const o: string[] = [];
  const rowH = 17;
  let y = 30;
  const top = y - 10;
  const head = (t: string) => {
    o.push(`<text x="14" y="${y}" fill="${C.muted}" font-size="7.6" letter-spacing="0.8" ${MONO}>${t}</text>`);
    y += 13;
  };
  const row = (r: Row) => {
    const colour = r.kind === 'measured' ? C.vessel : r.kind === 'knot' ? C.knot : C.fascia;
    o.push(`<text x="${x0 - 10}" y="${f(y + 3)}" text-anchor="end" fill="${C.text}" font-size="8.6" ${SERIF}>${r.label}</text>`);
    const a = X(r.from);
    const b = Math.max(X(r.to), a + 4);
    if (r.from === r.to) {
      o.push(`<circle cx="${f(a)}" cy="${f(y)}" r="3.4" fill="${colour}"/>`);
    } else if (r.pair) {
      o.push(`<line x1="${f(a)}" x2="${f(b)}" y1="${f(y)}" y2="${f(y)}" stroke="${colour}" stroke-width="1.2" stroke-dasharray="3 3"/>`);
      o.push(`<circle cx="${f(a)}" cy="${f(y)}" r="3.4" fill="${colour}"/><circle cx="${f(b)}" cy="${f(y)}" r="3.4" fill="${colour}"/>`);
    } else {
      o.push(`<rect x="${f(a)}" y="${f(y - 3.4)}" width="${f(b - a)}" height="6.8" rx="3.4" fill="${colour}" opacity="${r.kind === 'measured' ? 0.75 : 0.8}"/>`);
      if (r.dot) o.push(`<circle cx="${f(X(r.dot))}" cy="${f(y)}" r="3.4" fill="${colour}"/>`);
    }
    if (r.ends) {
      o.push(`<text x="${f(a - 4)}" y="${f(y + 2.6)}" text-anchor="end" fill="${C.muted}" font-size="6.8" ${MONO}>${r.ends[0]}</text>`);
      o.push(`<text x="${f(b + 4)}" y="${f(y + 2.6)}" fill="${C.muted}" font-size="6.8" ${MONO}>${r.ends[1]}</text>`);
    }
    y += rowH;
  };

  head('MEASURED');
  measured.forEach(row);
  y += 6;
  head('REPORTED, ROUGHLY');
  reported.forEach(row);
  const bottom = y - 6;

  // The axis: a second to a year, with faint lines at each mark.
  const ticks: [number, string][] = [
    [1, '1 s'],
    [10, '10 s'],
    [MIN, '1 min'],
    [10 * MIN, '10 min'],
    [HOUR, '1 h'],
    [DAY, '1 day'],
    [WEEK, '1 week'],
    [MONTH, '1 month'],
    [YEAR, '1 year'],
  ];
  const grid = ticks.map(([t]) => `<line x1="${f(X(t))}" x2="${f(X(t))}" y1="${top}" y2="${bottom}" stroke="${C.faint}" stroke-width="0.6"/>`);
  const labels = ticks.map(
    ([t, s]) => `<text x="${f(X(t))}" y="${bottom + 13}" text-anchor="middle" fill="${C.muted}" font-size="7.2" ${MONO}>${s}</text>`,
  );
  // A breath, for scale.
  const breath = `<rect x="${f(X(3))}" y="${top}" width="${f(X(15) - X(3))}" height="${bottom - top}" fill="${C.vessel}" opacity="0.09"/>
    <text x="${f((X(3) + X(15)) / 2)}" y="${top - 2}" text-anchor="middle" fill="${C.muted}" font-size="6.8" ${MONO}>a breath</text>`;
  const H = bottom + 24;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="How fast knots are reported to change, beside how fast the physiology the hypothesis names is measured to change, from a second to a year: the breath reaches the skin's vessels and a reopened vessel's flow peaks within seconds, as a knot lets go; a patch of skin warms over a minute or more, as a hot shower softens many; an arteriole constricted for five minutes keeps no trace, and one constricted for four hours relaxes incompletely; an artery remodels in days, as old knots persist for months; slower changes in the fascia are reported over days to weeks.">
    <rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="${C.card}"/>
    ${breath}${grid.join('')}${labels.join('')}${o.join('')}
  </svg>`;
}
