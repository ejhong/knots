/**
 * What a breath would have to do (sim/knots_sim/guide/envelope.py): for each theory, the least calming of the knot's
 * own drive, held for a given time, that frees the typical knot (and the easiest quarter), against what a slow
 * out-breath, a subtle breath and minutes of slow breathing do. Drawn at build time on paper; the theories are told apart
 * by line, never by colour.
 */
import type { TheoryIndex } from './data';

type Row = { d: number; q25: number | null; median: number | null; q75: number | null; never: number | null; n: number };
type Env = { rows: Row[]; breath: { out_breath: number; subtle: number; minutes: number } };

const MONO = 'font-family="SF Mono, Menlo, Monaco, monospace"';
const INK = '#3a3632';
const MUTED = '#8a7d6d';
const FAINT = '#b3a899';
const DASH: Record<string, string> = { T1: '', T3: '1 3', T7: '7 4', T6: '2 3 8 3' };

export function envelopeChart(theories: TheoryIndex[]): string {
  const W = 720;
  const H = 318;
  const L = 58;
  const R = 150;
  const T = 22;
  const B = 80;
  const x = (d: number) => L + (Math.log2(d) / 6) * (W - L - R);
  const y = (share: number) => T + (1 - Math.min(share, 1.05) / 1.05) * (H - T - B);
  const envs = theories.map((t) => ({ t, e: (t as unknown as { envelope?: Env }).envelope })).filter((z) => z.e);
  if (!envs.length) return '';
  const br = envs[0].e!.breath;
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="What a breath would have to do, theory by theory">`;
  // axes
  for (const s of [0, 0.25, 0.5, 0.75, 1]) {
    out += `<line x1="${L}" x2="${W - R}" y1="${y(s)}" y2="${y(s)}" stroke="${s === 1 ? MUTED : '#ece6de'}" stroke-width="1" ${s === 1 ? 'stroke-dasharray="3 3"' : ''}/>`;
    out += `<text x="${L - 6}" y="${y(s) + 3}" text-anchor="end" ${MONO} font-size="9" fill="${MUTED}">${Math.round(s * 100)}%</text>`;
  }
  out += `<text x="${L + 4}" y="${y(1) - 5}" ${MONO} font-size="8.5" fill="${MUTED}">all of it: drive down to rest</text>`;
  for (const d of [1, 2, 4, 8, 16, 32, 64]) {
    out += `<line x1="${x(d)}" x2="${x(d)}" y1="${H - B}" y2="${H - B + 4}" stroke="${MUTED}"/>`;
    out += `<text x="${x(d)}" y="${H - B + 15}" text-anchor="middle" ${MONO} font-size="9" fill="${MUTED}">${d < 60 ? `${d} s` : '1 min'}</text>`;
  }
  out += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="${MUTED}"/>`;
  out += `<text x="${(L + W - R) / 2}" y="${H - B + 30}" text-anchor="middle" ${MONO} font-size="9" fill="${MUTED}">how long the calming lasts, at the knot</text>`;
  out += `<text transform="translate(12 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" ${MONO} font-size="9" fill="${MUTED}">how much of the holding stress it takes away</text>`;
  // what a breath does
  const mark = (x0: number, x1: number, s: number, label: string) =>
    `<line x1="${x(x0)}" x2="${x(x1)}" y1="${y(s)}" y2="${y(s)}" stroke="${FAINT}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>` +
    `<text x="${x(x1) + 7}" y="${y(s) + 3}" ${MONO} font-size="8.5" fill="${MUTED}">${label}</text>`;
  out += mark(2, 4, br.out_breath, 'a slow out-breath');
  out += mark(2, 5, br.subtle, 'a subtle breath');
  out += mark(24, 64, br.minutes, 'minutes of slow breathing');
  // the theories: the typical knot (median, thick), and the easiest quarter (thin); a legend beneath
  for (const { t, e } of envs) {
    const rows = e!.rows;
    const path = (key: 'median' | 'q25') => {
      let d = '';
      let pen = false;
      for (const r of rows) {
        const v = r[key];
        if (v === null) {
          pen = false;
          continue;
        }
        d += `${pen ? 'L' : 'M'}${x(r.d).toFixed(1)} ${y(v).toFixed(1)} `;
        pen = true;
      }
      return d;
    };
    const med = path('median');
    const q = path('q25');
    const dash = DASH[t.id] ? `stroke-dasharray="${DASH[t.id]}"` : '';
    if (q) out += `<path d="${q}" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.35" ${dash}/>`;
    if (med) out += `<path d="${med}" fill="none" stroke="${INK}" stroke-width="1.8" ${dash}/>`;
    const last = [...rows].reverse().find((r) => r.median !== null);
    if (last) out += `<text x="${x(last.d) + 6}" y="${y(last.median!) + 3}" font-family="'Hiragino Mincho ProN', 'Yu Mincho', serif" font-size="11" fill="${INK}">${t.glyph}</text>`;
    const slot = envs.findIndex((z) => z.t === t);
    const ly = H - 26 + Math.floor(slot / 2) * 15;
    const lx2 = L + (slot % 2) * 300;
    const note = med ? '' : q ? ': the typical knot not by calming alone' : ': not by calming alone';
    out += `<line x1="${lx2}" x2="${lx2 + 22}" y1="${ly - 3}" y2="${ly - 3}" stroke="${INK}" stroke-width="1.8" ${dash}/>`;
    out += `<text x="${lx2 + 27}" y="${ly}" ${MONO} font-size="9" fill="${INK}">${t.glyph} ${t.name}${note}</text>`;
  }
  out += '</svg>';
  return out;
}
