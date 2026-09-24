/**
 * One perforator, magnified: an animated plate of a knot letting go.
 *
 * A cut through the layers — skin, superficial fat, superficial fascia, the
 * gliding plane, deep fascia, muscle — with one perforator's bundle rising
 * through its ring in the deep fascia: the artery (a wall of smooth muscle
 * around the blood), two veins, the nerve and a lymphatic. Held, the artery
 * is narrowed, the collar around the bundle is gelled — the knot, glowing —
 * and the nerve is pressed. On a slow out-breath the artery opens, blood
 * runs, the collar thins, and the starved nerve wakes: a spark runs up it
 * and its patch of skin lights. Then, softly, the plate begins again.
 *
 * Plain SVG driven by a clock, so it renders anywhere (the introduction's
 * canvas, a reading page). Not to scale: magnified for legibility.
 */
type Tone = 'dark' | 'light';

const PAL: Record<Tone, Record<string, string>> = {
  dark: {
    text: '#d6d9d3',
    faint: '#7f8b89',
    skin: '#5c5049',
    dermis: '#7b6d62',
    fat: '#3a332d',
    lobule: '#5f564b',
    sup: '#e6ded2',
    plane: '#2a2729',
    wisp: '#48423f',
    deep: '#efe7da',
    hatch: '#b8ae9f',
    muscle: '#46302b',
    fibre: '#6e4a41',
    wall: '#c9b3a6',
    lumen: '#4a2622',
    vein: '#7d8a96',
    veinLumen: '#2c333b',
    nerveDim: '#7f765c',
    nerve: '#e3cf82',
    lymph: '#8f9a94',
    knot: '#e27b61',
    knotEdge: '#f2b39f',
    calm: '#e6dccd',
    spark: '#a8e6cd',
    flow: '#efe7da',
  },
  light: {
    text: '#3a3632',
    faint: '#8a7d6d',
    skin: '#e7d6c8',
    dermis: '#cdb6a3',
    fat: '#f3e7c9',
    lobule: '#d9c7a2',
    sup: '#6b5d4d',
    plane: '#f1ebf0',
    wisp: '#ddd4da',
    deep: '#8a7d6d',
    hatch: '#b3a899',
    muscle: '#dcb5a9',
    fibre: '#c49488',
    wall: '#b08f84',
    lumen: '#8a4a40',
    vein: '#6d7d8c',
    veinLumen: '#b9c3cc',
    nerveDim: '#b8a878',
    nerve: '#9c8433',
    lymph: '#9aa5a0',
    knot: '#c4452f',
    knotEdge: '#93301f',
    calm: '#3a3632',
    spark: '#3f8f73',
    flow: '#6b5d4d',
  },
};

// Geometry (viewBox 340 × 236).
const X0 = 118; // the bundle's centre line
const Y = { skin: 30, dermis: 44, sup: 86, plane: 89, deep: 112, deepBottom: 118, bottom: 190 };
const LOOP = 10.5;

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export interface KnotPlate {
  el: HTMLElement;
  start(): void;
  stop(): void;
}

export function createKnotPlate(tone: Tone): KnotPlate {
  const c = PAL[tone];
  const id = `kp${Math.floor(Math.random() * 1e6)}`;
  const el = document.createElement('div');
  el.className = `knot-plate ${tone}`;

  const lobules = Array.from({ length: 7 }, (_, i) => {
    const cx = 30 + i * 33 + (i % 2) * 6;
    return `<ellipse cx="${cx}" cy="${(Y.dermis + Y.sup) / 2 + (i % 2 ? 4 : -3)}" rx="15" ry="${i % 2 ? 11 : 13}" fill="none" stroke="${c.lobule}" stroke-width="0.7"/>`;
  }).join('');
  const fibres = Array.from({ length: 6 }, (_, i) => {
    const y = Y.deepBottom + 10 + i * 12;
    return `<path d="M14 ${y} Q 80 ${y - 3} 150 ${y} T 250 ${y}" fill="none" stroke="${c.fibre}" stroke-width="0.7" stroke-dasharray="7 4" opacity="0.8"/>`;
  }).join('');
  const wisps = Array.from({ length: 4 }, (_, i) => {
    const y = Y.plane + 5 + i * 5;
    return `<path d="M14 ${y} Q 60 ${y - 2} 100 ${y} T 190 ${y} T 250 ${y}" fill="none" stroke="${c.wisp}" stroke-width="0.6"/>`;
  }).join('');
  // Branches rising from the superficial fascia to the plexus under the skin.
  const branch = (dx: number, dy: number) =>
    `<path d="M${X0} ${Y.sup} C ${X0 + dx * 0.2} ${Y.sup - 18}, ${X0 + dx * 0.7} ${Y.dermis + 12 + dy}, ${X0 + dx} ${Y.dermis + 3 + dy}" fill="none" stroke="${c.wall}" stroke-width="0.9" opacity="0.55"/>`;
  const branches = [branch(-72, 1), branch(-34, -1), branch(38, 0), branch(84, 2)].join('');
  const nerveD = `M${X0 + 17} ${Y.bottom} L ${X0 + 17} ${Y.plane + 2} C ${X0 + 17} ${Y.sup - 20}, ${X0 + 30} ${Y.dermis + 14}, ${X0 + 34} ${Y.skin + 7}`;
  const starPath = (s: number) =>
    `M0 ${-s} L ${s * 0.22} ${-s * 0.22} L ${s} 0 L ${s * 0.22} ${s * 0.22} L 0 ${s} L ${-s * 0.22} ${s * 0.22} L ${-s} 0 L ${-s * 0.22} ${-s * 0.22} Z`;
  const label = (y: number, t: string) => `<text x="258" y="${y}" fill="${c.faint}" font-size="8.5" font-family="SF Mono, Menlo, monospace">${t}</text>`;
  const tag = (x: number, y: number, t: string, anchor = 'middle') =>
    `<text x="${x}" y="${y}" fill="${c.faint}" font-size="7.5" font-family="SF Mono, Menlo, monospace" text-anchor="${anchor}">${t}</text>`;

  el.innerHTML = `<svg viewBox="0 0 340 236" role="img" aria-label="One perforator, magnified, as its knot lets go">
    <defs>
      <radialGradient id="${id}-glow"><stop offset="0" stop-color="${c.knot}" stop-opacity="0.95"/><stop offset="0.55" stop-color="${c.knot}" stop-opacity="0.35"/><stop offset="1" stop-color="${c.knot}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-patch"><stop offset="0" stop-color="${c.spark}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.spark}" stop-opacity="0"/></radialGradient>
      <pattern id="${id}-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="5" stroke="${c.hatch}" stroke-width="0.6"/></pattern>
      <clipPath id="${id}-clip"><rect x="14" y="${Y.skin}" width="236" height="${Y.bottom - Y.skin}" rx="3"/></clipPath>
    </defs>
    <text x="14" y="16" fill="${c.faint}" font-size="8" font-family="SF Mono, Menlo, monospace">ONE PERFORATOR · MAGNIFIED</text>
    <g clip-path="url(#${id}-clip)">
      <rect x="14" y="${Y.skin}" width="236" height="${Y.dermis - Y.skin}" fill="${c.skin}"/>
      <line x1="14" x2="250" y1="${Y.skin + 4}" y2="${Y.skin + 4}" stroke="${c.dermis}" stroke-width="0.6"/>
      <rect x="14" y="${Y.dermis}" width="236" height="${Y.sup - Y.dermis}" fill="${c.fat}"/>
      ${lobules}
      <rect x="14" y="${Y.plane}" width="236" height="${Y.deep - Y.plane}" fill="${c.plane}"/>
      ${wisps}
      <rect x="14" y="${Y.deepBottom}" width="236" height="${Y.bottom - Y.deepBottom}" fill="${c.muscle}"/>
      ${fibres}
      <path d="M14 ${Y.dermis + 3} Q 70 ${Y.dermis + 1} 120 ${Y.dermis + 3} T 250 ${Y.dermis + 3}" fill="none" stroke="${c.wall}" stroke-width="0.6" opacity="0.35"/>
      ${branches}
      <rect x="14" y="${Y.sup}" width="236" height="${Y.plane - Y.sup}" fill="${c.sup}" opacity="0.9"/>
      <rect x="14" y="${Y.deep}" width="${X0 - 13 - 14}" height="${Y.deepBottom - Y.deep}" fill="${c.deep}"/>
      <rect x="${X0 + 13}" y="${Y.deep}" width="${250 - X0 - 13}" height="${Y.deepBottom - Y.deep}" fill="${c.deep}"/>
      <rect x="14" y="${Y.deep}" width="236" height="${Y.deepBottom - Y.deep}" fill="url(#${id}-hatch)" opacity="0.5"/>
      <ellipse data-glow cx="${X0}" cy="${(Y.deep + Y.deepBottom) / 2}" rx="48" ry="24" fill="url(#${id}-glow)"/>
      <path d="M${X0 - 17} ${Y.bottom} L ${X0 - 17} ${Y.sup + 1}" fill="none" stroke="${c.lymph}" stroke-width="0.9" stroke-dasharray="3 2.5" opacity="0.8"/>
      <rect data-vein x="${X0 - 12}" y="${Y.sup}" width="5" height="${Y.bottom - Y.sup}" rx="2" fill="${c.veinLumen}" stroke="${c.vein}" stroke-width="0.9"/>
      <rect data-vein x="${X0 + 7}" y="${Y.sup}" width="5" height="${Y.bottom - Y.sup}" rx="2" fill="${c.veinLumen}" stroke="${c.vein}" stroke-width="0.9"/>
      <rect data-wall y="${Y.sup}" height="${Y.bottom - Y.sup}" rx="2.5" fill="${c.wall}"/>
      <rect data-lumen y="${Y.sup}" height="${Y.bottom - Y.sup}" rx="1.5" fill="${c.lumen}"/>
      <g data-flow>${Array.from({ length: 8 }, () => `<circle r="1.05" fill="${c.flow}"/>`).join('')}</g>
      <path data-nerve d="${nerveD}" fill="none" stroke="${c.nerveDim}" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse data-collar cx="${X0}" cy="${(Y.deep + Y.deepBottom) / 2}" rx="24" ry="8" stroke-width="1"/>
      <ellipse cx="${X0}" cy="${(Y.deep + Y.deepBottom) / 2}" rx="13" ry="3.4" fill="none" stroke="${c.deep}" stroke-width="0.9" opacity="0.9"/>
      <ellipse data-patch cx="${X0 + 34}" cy="${Y.skin + 7}" rx="34" ry="7" fill="url(#${id}-patch)" opacity="0"/>
      <path data-star d="${starPath(7)}" fill="${c.spark}" opacity="0"/>
      <circle data-spark r="2.6" fill="${c.spark}" opacity="0"/>
    </g>
    ${label(Y.skin + 9, 'skin')}
    ${label((Y.dermis + Y.sup) / 2 + 3, 'fat')}
    ${label(Y.sup + 3, 'sup. fascia')}
    ${label((Y.plane + Y.deep) / 2 + 3, 'gliding plane')}
    ${label(Y.deepBottom - 1, 'deep fascia')}
    ${label(Y.deepBottom + 30, 'muscle')}
    ${tag(X0, Y.bottom + 10, 'lymphatic · vein · artery · vein · nerve')}
    ${tag(X0 + 30, (Y.deep + Y.deepBottom) / 2 + 3, 'collar', 'start')}
    <text data-caption x="14" y="${Y.bottom + 34}" fill="${c.text}" font-size="9.5" font-family="Georgia, serif" font-style="italic"></text>
    <text data-breath x="14" y="${Y.bottom + 44}" fill="${c.faint}" font-size="7.5" font-family="SF Mono, Menlo, monospace"></text>
  </svg>`;

  const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
  const svg = q<SVGSVGElement>('svg');
  const wall = q<SVGRectElement>('[data-wall]');
  const lumen = q<SVGRectElement>('[data-lumen]');
  const collar = q<SVGEllipseElement>('[data-collar]');
  const glow = q<SVGEllipseElement>('[data-glow]');
  const nerve = q<SVGPathElement>('[data-nerve]');
  const spark = q<SVGCircleElement>('[data-spark]');
  const star = q<SVGPathElement>('[data-star]');
  const patch = q<SVGEllipseElement>('[data-patch]');
  const caption = q<SVGTextElement>('[data-caption]');
  const breath = q<SVGTextElement>('[data-breath]');
  const dots = [...el.querySelectorAll<SVGCircleElement>('[data-flow] circle')];
  const dotY = dots.map((_, i) => i / dots.length);
  const nerveLen = () => nerve.getTotalLength?.() ?? 0;

  const CAPTIONS: [number, string, string][] = [
    [0, 'A knot: the artery narrowed, its collar gelled, the nerve pressed.', 'breathing in · held'],
    [3.2, 'On a slow out-breath the artery opens…', 'breathing out · letting go'],
    [4.8, '…blood runs, the collar thins, and the waking nerve lights its patch of skin.', 'open'],
    [8.6, '', ''],
  ];

  let raf = 0;
  let t0 = 0;
  let last = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = ((now - t0) / 1000) % LOOP;
    // Release, eased over the out-breath; the plate dips and begins again at the end.
    const open = t < 9.4 ? smooth(3.2, 4.8, t) : 0;
    const dip = t < 8.6 ? 1 : t < 9.4 ? mix(1, 0.12, smooth(8.6, 9.4, t)) : mix(0.12, 1, smooth(9.4, 10.4, t));
    svg.style.opacity = String(dip);
    const beat = 0.25 * Math.sin(now / 1000 * 2 * Math.PI * 1.1);
    const lum = mix(1.4, 5.6, open) + beat * (0.4 + open);
    const wallW = mix(3.4, 1.4, open);
    const w = lum + 2 * wallW;
    wall.setAttribute('x', (X0 - w / 2).toFixed(2));
    wall.setAttribute('width', w.toFixed(2));
    lumen.setAttribute('x', (X0 - lum / 2).toFixed(2));
    lumen.setAttribute('width', lum.toFixed(2));
    // The collar: thick and glowing while held; thin and quiet once open.
    const held = 1 - open;
    collar.setAttribute('rx', mix(15, 24, held).toFixed(2));
    collar.setAttribute('ry', mix(4, 8.5, held).toFixed(2));
    collar.setAttribute('fill', held > 0.5 ? PAL[tone].knot : PAL[tone].calm);
    collar.setAttribute('fill-opacity', (held > 0.5 ? 0.18 + 0.4 * held : 0.06).toFixed(3));
    collar.setAttribute('stroke', held > 0.5 ? PAL[tone].knotEdge : PAL[tone].faint);
    collar.setAttribute('stroke-opacity', (0.4 + 0.5 * held).toFixed(3));
    const breathe = 0.85 + 0.15 * Math.sin((now / 1000) * 1.2);
    glow.setAttribute('opacity', (held * held * breathe).toFixed(3));
    nerve.setAttribute('stroke', open > 0.6 ? PAL[tone].nerve : PAL[tone].nerveDim);
    // Blood: a trickle while narrowed, a stream once open.
    const speed = mix(0.04, 0.5, open);
    dots.forEach((d, i) => {
      dotY[i] = (dotY[i] + dt * speed * (0.8 + (i % 3) * 0.15)) % 1;
      const y = Y.bottom - dotY[i] * (Y.bottom - Y.sup);
      d.setAttribute('cx', (X0 + ((i % 3) - 1) * lum * 0.22).toFixed(2));
      d.setAttribute('cy', y.toFixed(2));
      d.setAttribute('opacity', (0.35 + 0.55 * open).toFixed(2));
    });
    // The spark: up the nerve, then a star and a patch of light on the skin.
    const L = nerveLen();
    const s = smooth(3.5, 4.3, t);
    if (L > 0 && t > 3.5 && t < 4.4) {
      const p = nerve.getPointAtLength(L * s);
      spark.setAttribute('cx', p.x.toFixed(2));
      spark.setAttribute('cy', p.y.toFixed(2));
      spark.setAttribute('opacity', '1');
    } else spark.setAttribute('opacity', '0');
    const lit = t < 4.2 ? 0 : t < 4.5 ? smooth(4.2, 4.5, t) : 1 - smooth(4.5, 6.2, t);
    patch.setAttribute('opacity', (lit * 0.9).toFixed(3));
    star.setAttribute('opacity', lit.toFixed(3));
    star.setAttribute('transform', `translate(${X0 + 34} ${Y.skin + 4}) scale(${(0.6 + lit * 0.6).toFixed(3)}) rotate(${(t * 20).toFixed(1)})`);
    let k = 0;
    while (k < CAPTIONS.length - 1 && t >= CAPTIONS[k + 1][0]) k++;
    if (caption.textContent !== CAPTIONS[k][1]) caption.textContent = CAPTIONS[k][1];
    if (breath.textContent !== CAPTIONS[k][2]) breath.textContent = CAPTIONS[k][2];
  };

  return {
    el,
    start() {
      if (raf) return;
      t0 = last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
