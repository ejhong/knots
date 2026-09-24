/**
 * A true-scale cross-section through the skin at one place: skin,
 * superficial fat, superficial fascia, the gliding plane, deep fascia,
 * muscle — with perforators, and a mark where a hypothesis puts the knot.
 * The knot is always drawn the same way, in the one knot colour; only its
 * place changes.
 * Pure SVG (a string), so it renders at build time on the Hypotheses page
 * and live in the atlas as the pointer moves.
 */
export interface SectionInput {
  /** Depth of the superficial fascia and of the deep fascia below the skin (m). */
  dSup: number;
  dDeep: number;
  /** Hypothesis id (see src/data/hypotheses.ts). */
  hypothesis: string;
  /** Region label, e.g. "upper back". */
  region?: string;
  /** Colours for a dark panel or a light page. */
  tone?: 'dark' | 'light';
  width?: number;
}

const PAL = {
  dark: {
    text: '#cfc5b8',
    faint: '#8f857a',
    skin: '#6d5f55',
    fat: '#4a4338',
    sup: '#e6ded2',
    plane: '#39353a',
    deep: '#efe7da',
    muscle: '#5a3a33',
    fibre: '#6e4a41',
    vessel: '#e6dccd',
    band: '#9a6a5e',
    knot: '#e38a72',
    nerve: '#d9c77a',
  },
  light: {
    text: '#3a3632',
    faint: '#8a7d6d',
    skin: '#e7d6c8',
    fat: '#f3e7c9',
    sup: '#6b5d4d',
    plane: '#efe9ee',
    deep: '#8a7d6d',
    muscle: '#d9b2a6',
    fibre: '#c49488',
    vessel: '#3a3632',
    band: '#b88579',
    knot: '#c87868',
    nerve: '#a08a3a',
  },
};

const mm = (m: number) => `${Math.round(m * 1000)} mm`;

export function crossSectionSVG({ dSup, dDeep, hypothesis, region, tone = 'dark', width = 272 }: SectionInput): string {
  const c = PAL[tone];
  const W = width;
  const labelW = 86;
  const x0 = 6;
  const x1 = W - labelW;
  const top = 18;
  const H = 150;
  const muscleMm = 14;
  const skinMm = 2;
  const totalMm = dDeep * 1000 + muscleMm;
  const k = (H - top - 8) / totalMm; // px per mm
  const y = (depthM: number) => top + depthM * 1000 * k;
  const ySkin = top;
  const yDermis = y(skinMm / 1000);
  const ySup = y(Math.max(dSup, (skinMm + 1) / 1000));
  const yDeep = y(dDeep);
  const yBottom = H - 8;
  const mid = (x0 + x1) / 2;

  const parts: string[] = [];
  const rect = (y1: number, y2: number, fill: string, op = 1) =>
    parts.push(`<rect x="${x0}" y="${y1.toFixed(1)}" width="${x1 - x0}" height="${Math.max(0.5, y2 - y1).toFixed(1)}" fill="${fill}" opacity="${op}"/>`);
  const line = (yy: number, stroke: string, w = 1.2, dash = '') =>
    parts.push(`<line x1="${x0}" x2="${x1}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
  const label = (yy: number, text: string, sub = '') =>
    parts.push(
      `<text x="${x1 + 8}" y="${(yy + 3).toFixed(1)}" fill="${c.text}" font-size="8.5" font-family="SF Mono, Menlo, monospace">${text}</text>` +
        (sub ? `<text x="${x1 + 8}" y="${(yy + 12).toFixed(1)}" fill="${c.faint}" font-size="7.5" font-family="SF Mono, Menlo, monospace">${sub}</text>` : ''),
    );

  // Bands.
  rect(ySkin, yDermis, c.skin);
  rect(yDermis, ySup, c.fat, 0.85);
  rect(ySup, yDeep, c.plane);
  rect(yDeep, yBottom, c.muscle, 0.9);
  // Fat lobules.
  for (let i = 0; i < 9; i++) {
    const cx = x0 + 10 + i * ((x1 - x0 - 20) / 8);
    const cy = (yDermis + ySup) / 2;
    const r = Math.min(5, (ySup - yDermis) / 2 - 1);
    if (r > 1.2) parts.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(r * 1.3).toFixed(1)}" ry="${r.toFixed(1)}" fill="none" stroke="${c.faint}" stroke-width="0.5" opacity="0.6"/>`);
  }
  // Muscle fibres.
  for (let i = 0; i < 4; i++) {
    const fy = yDeep + 5 + i * ((yBottom - yDeep - 8) / 3);
    line(fy, c.fibre, 0.6, '6 3');
  }
  // Fasciae.
  line(ySup, c.sup, 1.3);
  line(yDeep, c.deep, 1.8);

  // Perforators: a major one through the deep fascia, and small ones through the superficial fascia.
  const px = mid - 30;
  parts.push(`<line x1="${px}" x2="${px}" y1="${yBottom}" y2="${ySup}" stroke="${c.vessel}" stroke-width="1.6"/>`);
  for (const dx of [-16, 14, 30]) {
    parts.push(`<path d="M${px} ${(ySup + 1).toFixed(1)} Q ${px + dx * 0.4} ${(ySup - 4).toFixed(1)} ${px + dx} ${(ySup - 6).toFixed(1)} L ${px + dx} ${(yDermis + 1).toFixed(1)}" fill="none" stroke="${c.vessel}" stroke-width="0.7" opacity="0.8"/>`);
  }
  for (const sx of [mid + 38, mid + 62]) {
    parts.push(`<line x1="${sx}" x2="${sx}" y1="${ySup + 3}" y2="${yDermis + 1}" stroke="${c.vessel}" stroke-width="0.7" opacity="0.8"/>`);
  }

  // Where this hypothesis puts the knot — always the same mark.
  const dot = (cx: number, cy: number, r = 3.4) =>
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${c.knot}"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r + 3}" fill="none" stroke="${c.knot}" stroke-width="0.8" opacity="0.6"/>`);
  let note = '';
  switch (hypothesis) {
    case 'perforator':
      dot(px, yDeep, 3.6);
      dot(mid + 38, ySup, 2.4);
      note = 'a perforator held where it pierces a fascia';
      break;
    case 'latch': {
      const ly = yDeep + (yBottom - yDeep) * 0.5;
      parts.push(`<path d="M${mid - 60} ${ly} L ${mid + 40} ${ly}" stroke="${c.vessel}" stroke-width="1" opacity="0.7"/>`);
      dot(mid + 8, ly, 3.2);
      note = 'a latched arteriole inside muscle';
      break;
    }
    case 'trigger-point': {
      const ty = yDeep + (yBottom - yDeep) * 0.55;
      parts.push(`<line x1="${mid - 50}" x2="${mid + 60}" y1="${ty}" y2="${ty}" stroke="${c.band}" stroke-width="3" opacity="0.8" stroke-linecap="round"/>`);
      dot(mid + 10, ty, 3.4);
      note = 'a contraction knot in a taut band of muscle';
      break;
    }
    case 'densification':
      parts.push(`<ellipse cx="${mid + 20}" cy="${((ySup + yDeep) / 2).toFixed(1)}" rx="34" ry="${Math.max(2.5, (yDeep - ySup) / 2 - 1).toFixed(1)}" fill="${c.knot}" opacity="0.4"/>`);
      note = 'thickened hyaluronan in the gliding plane';
      break;
    case 'nerve': {
      const nx = mid + 50;
      parts.push(`<path d="M${nx} ${yBottom} L ${nx} ${yDeep} L ${nx - 6} ${ySup} L ${nx - 10} ${yDermis}" fill="none" stroke="${c.nerve}" stroke-width="1.2"/>`);
      dot(nx, yDeep, 3);
      note = 'a sensitised nerve where it pierces the fascia';
      break;
    }
    case 'central':
      note = 'nothing special in the tissue: made in the spinal cord and brain';
      break;
  }

  // Labels at their layers, pushed apart so they never collide.
  const labels: [number, string, string][] = [
    [ySkin + 2, 'skin', ''],
    [ySup, 'sup. fascia', mm(dSup)],
    [(ySup + yDeep) / 2, 'gliding plane', ''],
    [yDeep, 'deep fascia', mm(dDeep)],
    [(yDeep + yBottom) / 2 + 6, 'muscle', ''],
  ];
  let prev = -Infinity;
  for (const l of labels) {
    const need = prev + (labels.indexOf(l) > 0 && labels[labels.indexOf(l) - 1][2] ? 21 : 12);
    const yy = Math.max(l[0], need);
    // A tick from the label back to its layer when displaced.
    if (yy - l[0] > 2) parts.push(`<line x1="${x1}" x2="${x1 + 5}" y1="${l[0].toFixed(1)}" y2="${yy.toFixed(1)}" stroke="${c.faint}" stroke-width="0.5"/>`);
    label(yy, l[1], l[2]);
    prev = yy;
  }

  const head = `<text x="${x0}" y="10" fill="${c.faint}" font-size="8" font-family="SF Mono, Menlo, monospace">${region ? `${region} · ` : ''}true scale</text>`;
  const foot = note
    ? `<text x="${x0}" y="${H + 10}" fill="${c.text}" font-size="8.5" font-family="Georgia, serif" font-style="italic">${note}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 16}" width="${W}" height="${H + 16}" role="img" aria-label="Cross-section: skin, superficial fascia, gliding plane, deep fascia, muscle">${head}${parts.join('')}${foot}</svg>`;
}
