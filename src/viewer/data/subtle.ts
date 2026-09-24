import type { Vec3 } from '../anchors/locate';
import { bindPoint, type Bound } from './bind';
import type { InnerLine, InnerMapData, InnerPlace } from '../maps/InnerMap';

/**
 * The subtle body of three contemplative traditions, drawn inside the figure:
 *
 *  - Yoga and tantra, after the Ṣaṭ-cakra-nirūpaṇa (tr. Avalon, The Serpent
 *    Power): the central channel suṣumṇā within the spine, iḍā and piṅgalā
 *    beside it, the seven lotuses with their petals, and the three knots
 *    (granthis).
 *  - Tibetan practice, after the Six Yogas of Nāropa: the central channel and
 *    the two side channels, the four wheels with their spokes, and the
 *    channel-knots where the side channels coil around the central one; with
 *    the kati channel of Dzogchen.
 *  - Daoist internal alchemy: the microcosmic orbit and the three dantian.
 *
 * They are maps drawn from the inside, not anatomy. Positions are the
 * traditions' own (a level of the body, the spine, the centre) placed on
 * this figure, in reference-adult coordinates (metres; +x the figure's left,
 * +y up, +z front), and bound to the skeleton so they follow the figure.
 */

const bind = (p: Vec3): Bound => bindPoint(p, 'axis');
const mix = (a: Vec3, b: Vec3, f: number): Vec3 => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const dist = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/** Two passes of corner cutting, keeping the ends. */
function smooth(points: Vec3[]): Vec3[] {
  let pts = points;
  for (let pass = 0; pass < 2 && pts.length > 2; pass++) {
    const out: Vec3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) out.push(mix(pts[i], pts[i + 1], 0.25), mix(pts[i], pts[i + 1], 0.75));
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

/** A smooth line through reference points, sampled about every `step` metres and bound to the skeleton. */
function path(points: Vec3[], step = 0.012): Bound[] {
  const pts = smooth(points);
  const out: Bound[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const n = Math.max(1, Math.ceil(dist(pts[i], pts[i + 1]) / step));
    for (let k = 0; k < n; k++) out.push(bind(mix(pts[i], pts[i + 1], k / n)));
  }
  out.push(bind(pts[pts.length - 1]));
  return out;
}

const line = (group: number, pts: Vec3[], point?: number, side: InnerLine['side'] = 'm'): InnerLine => ({ group, side, point, path: pts.map(bind) });

/**
 * A lotus: its rim and its petals. Facing forward (in the frontal plane), no
 * petal points straight up or down; level (the crown's), its petals hang
 * down around the head.
 */
function lotus(group: number, point: number, c: Vec3, r: number, petals: number, level = false): InnerLine[] {
  const at = (a: number, rad: number): Vec3 =>
    level
      ? [c[0] + Math.cos(a) * rad, c[1] - (rad - r) * 1.1, c[2] + Math.sin(a) * rad]
      : [c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad, c[2]];
  const lines = [line(group, Array.from({ length: 49 }, (_, k) => at((k / 48) * Math.PI * 2, r)), point)];
  const n = Math.min(petals, 48);
  const half = Math.min((Math.PI / n) * 0.92, 0.6);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.PI / 2 + Math.PI / n;
    const pts: Vec3[] = [];
    for (let q = 0; q <= 8; q++) {
      const s = q / 4 - 1;
      pts.push(at(a + half * s, r * (1 + 0.42 * (1 - Math.abs(s)) ** 0.7)));
    }
    lines.push(line(group, pts, point));
  }
  return lines;
}

/** A wheel about the central channel: level, its spokes arching down (`dir` −1, like an umbrella) or up (+1). */
function wheel(group: number, point: number, c: Vec3, r: number, spokes: number, dir: 1 | -1): InnerLine[] {
  const at = (a: number, f: number): Vec3 => [c[0] + Math.cos(a) * r * f, c[1] + dir * r * 0.45 * f * f, c[2] + Math.sin(a) * r * f];
  const lines = [line(group, Array.from({ length: 49 }, (_, k) => at((k / 48) * Math.PI * 2, 1)), point)];
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2;
    lines.push(line(group, [0.12, 0.35, 0.6, 0.8, 1].map((f) => at(a, f)), point));
  }
  return lines;
}

const place = (group: number, at: Vec3, shape: 0 | 1 | 2, kicker: string, title: string, sub: string, where: string): InnerPlace => ({
  group,
  side: 'm',
  at: bind(at),
  kicker,
  title,
  sub,
  where,
  shape,
});

/* ---------- Yoga and tantra. ---------- */

/** Suṣumṇā, within the spine from its base to the crown, bending forward past the brow. */
const SUSHUMNA: Vec3[] = [
  [0, 0.868, -0.02],
  [0, 0.95, -0.045],
  [0, 1.011, -0.035],
  [0, 1.081, -0.028],
  [0, 1.14, -0.035],
  [0, 1.32, -0.045],
  [0, 1.4, -0.03],
  [0, 1.475, -0.004],
  [0, 1.56, 0.035],
  [0, 1.64, 0.1],
  [0, 1.7, 0.07],
  [0, 1.72, 0.045],
];

/** A side nāḍī beside the spine (x > 0 the figure's left), past the brow, to its nostril. */
const sideNadi = (x: number): Vec3[] => [
  [x * 0.6, 0.868, -0.02],
  [x, 0.95, -0.045],
  [x, 1.011, -0.035],
  [x, 1.14, -0.035],
  [x, 1.32, -0.045],
  [x, 1.4, -0.03],
  [x, 1.475, -0.004],
  [x * 0.8, 1.56, 0.04],
  [x * 0.5, 1.632, 0.1],
  [x * 0.45, 1.585, 0.145],
];

type Cakra = [name: string, deva: string, meaning: string, at: Vec3, r: number, petals: string, n: number, where: string];
const CAKRAS: Cakra[] = [
  ['Mūlādhāra', 'मूलाधार', 'root support', [0, 0.868, -0.02], 0.024, 'four petals', 4, 'At the base of the spine, between the anus and the genitals: four petals; the element earth. Here kuṇḍalinī is said to sleep, coiled three and a half times.'],
  ['Svādhiṣṭhāna', 'स्वाधिष्ठान', 'one’s own seat', [0, 0.95, -0.045], 0.024, 'six petals', 6, 'At the root of the genitals: six petals; the element water.'],
  ['Maṇipūra', 'मणिपूर', 'city of jewels', [0, 1.058, -0.031], 0.03, 'ten petals', 10, 'At the level of the navel: ten petals; the element fire.'],
  ['Anāhata', 'अनाहत', 'unstruck', [0, 1.32, -0.045], 0.034, 'twelve petals', 12, 'At the level of the heart: twelve petals; the element air. Its name is the sound heard here without a striking.'],
  ['Viśuddha', 'विशुद्ध', 'purified', [0, 1.475, -0.004], 0.026, 'sixteen petals', 16, 'At the throat: sixteen petals; the element space.'],
  ['Ājñā', 'आज्ञा', 'command', [0, 1.64, 0.1], 0.02, 'two petals', 2, 'Between the eyebrows, within the head: two petals; the mind. Here iḍā and piṅgalā meet the central channel.'],
  ['Sahasrāra', 'सहस्रार', 'thousand-petalled', [0, 1.738, 0.045], 0.04, 'a thousand petals', 1000, 'At the crown of the head, or just above it: the lotus of a thousand petals, hanging down over the head.'],
];

export function yogaMap(): InnerMapData {
  const lines: InnerLine[] = [
    { group: 0, side: 'm', path: path(SUSHUMNA) },
    { group: 1, side: 'l', path: path(sideNadi(0.024)) },
    { group: 2, side: 'r', path: path(sideNadi(-0.024)) },
  ];
  const points: InnerPlace[] = [];
  CAKRAS.forEach(([name, deva, meaning, c, r, petals, n, where], i) => {
    points.push(place(3, c, 0, `cakra ${i + 1} of 7 · ${petals}`, `${name}  ${deva}`, `“${meaning}”`, where));
    lines.push(...lotus(3, points.length - 1, c, r, n, n > 100));
  });
  points.push(
    place(
      4,
      [0, 0.906, -0.034],
      1,
      'granthi · the first knot',
      'Brahma granthi  ब्रह्मग्रन्थि',
      'the knot of Brahmā',
      'Low in the body, at the root, in most accounts; the Haṭha Yoga Pradīpikā, as its commentators read it, puts it at the heart. Breath and attention are said to pierce the three knots in turn, and each piercing marks a stage.',
    ),
    place(
      4,
      [0, 1.395, -0.036],
      1,
      'granthi · the second knot',
      'Viṣṇu granthi  विष्णुग्रन्थि',
      'the knot of Viṣṇu',
      'At the heart in many accounts; at the navel in the Lalitā Sahasranāma, and at the throat in the Haṭha Yoga Pradīpikā, as its commentators read it.',
    ),
    place(4, [0, 1.676, 0.09], 1, 'granthi · the third knot', 'Rudra granthi  रुद्रग्रन्थि', 'the knot of Rudra', 'Between the brows, in all these accounts.'),
  );
  return {
    id: 'chakras',
    title: 'Cakras and nāḍīs',
    inner: true,
    groups: [
      {
        chip: 'suṣumṇā',
        name: 'Suṣumṇā  सुषुम्ना',
        course: 'The central channel, within the spine from its base to the crown: in the tantric account, the path of kuṇḍalinī through the lotuses and the three knots.',
      },
      {
        chip: 'iḍā',
        name: 'Iḍā  इडा',
        course: 'The left channel — lunar, cooling — beside the spine on the left, from its base to the left nostril. Many depictions wind it around the central channel, crossing at the lotuses.',
      },
      { chip: 'piṅgalā', name: 'Piṅgalā  पिङ्गला', course: 'The right channel — solar, heating — beside the spine on the right, from its base to the right nostril.' },
      { chip: 'cakras', name: 'The seven cakras', course: 'Lotuses on the central channel from the root to the crown, each with its number of petals and its element.' },
      { chip: 'granthis', name: 'The three granthis', course: 'Three knots on the central channel — of Brahmā, Viṣṇu and Rudra — that breath and attention pierce in turn. The texts differ on where the first two lie.' },
    ],
    points,
    lines,
  };
}

/* ---------- Tibetan practice. ---------- */

/** The central channel, in the centre of the body from the crown to four finger-widths below the navel. */
const CENTRAL: Vec3[] = [
  [0, 1.718, 0.045],
  [0, 1.62, 0.05],
  [0, 1.48, 0.028],
  [0, 1.32, 0.025],
  [0, 1.058, 0.04],
  [0, 0.985, 0.04],
];

type Wheel = [name: string, wylie: string, meaning: string, at: Vec3, r: number, spokes: number, dir: 1 | -1, turns: number];
const WHEELS: Wheel[] = [
  ['Crown', 'bde chen ’khor lo', 'the wheel of great bliss', [0, 1.7, 0.047], 0.042, 32, -1, 1.5],
  ['Throat', 'longs spyod ’khor lo', 'the wheel of enjoyment', [0, 1.48, 0.028], 0.03, 16, 1, 1.5],
  ['Heart', 'chos kyi ’khor lo', 'the wheel of dharma', [0, 1.32, 0.025], 0.045, 8, -1, 3],
  ['Navel', 'sprul pa’i ’khor lo', 'the wheel of emanation', [0, 1.058, 0.04], 0.05, 64, 1, 1.5],
];

const SPOKES: Record<number, string> = { 8: 'Eight', 16: 'Sixteen', 32: 'Thirty-two', 64: 'Sixty-four' };

const COIL_R = 0.011;

/**
 * A side channel (`s` +1 the left, −1 the right): joined to the central
 * channel below the navel, beside it to the crown, coiling around it at each
 * wheel (the two in opposite senses), then down to its nostril.
 */
function sideChannel(s: 1 | -1): Vec3[] {
  const pts: Vec3[] = [
    [0, 0.985, 0.04],
    [s * COIL_R, 1.0, 0.04],
  ];
  for (const [, , , c, , , , turns] of [...WHEELS].reverse()) {
    const h = 0.012 * turns;
    const steps = Math.round(turns * 16);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const a = (s > 0 ? 0 : Math.PI) + s * f * turns * Math.PI * 2;
      pts.push([Math.cos(a) * COIL_R, c[1] - h / 2 + h * f, c[2] + Math.sin(a) * COIL_R]);
    }
  }
  pts.push([s * COIL_R * 0.9, 1.72, 0.07], [s * COIL_R * 0.9, 1.67, 0.12], [s * COIL_R, 1.585, 0.145]);
  return pts;
}

export function tibetanMap(): InnerMapData {
  const lines: InnerLine[] = [
    { group: 0, side: 'm', path: path(CENTRAL) },
    { group: 1, side: 'r', path: path(sideChannel(-1), 0.006) },
    { group: 2, side: 'l', path: path(sideChannel(1), 0.006) },
  ];
  const points: InnerPlace[] = [];
  for (const [name, wylie, meaning, c, r, spokes, dir] of WHEELS) {
    const heart = name === 'Heart';
    points.push(
      place(
        3,
        c,
        1,
        `wheel · ${spokes} spokes · channel-knots`,
        `${name} — ${wylie}`,
        meaning,
        `${SPOKES[spokes]} spokes arch ${dir < 0 ? 'down from the central channel, like an umbrella' : 'up from the central channel, like an umbrella turned up'}. Here the side channels coil around the central one, knotting it (rtsa mdud)${heart ? ' — at the heart, most tightly' : ''}.`,
      ),
    );
    lines.push(...wheel(3, points.length - 1, c, r, spokes, dir));
  }
  // The kati channel of Dzogchen: from the heart, up through the throat, to the eyes.
  const behindEyes: Vec3 = [0, 1.605, 0.095];
  lines.push(line(4, smooth([[0, 1.32, 0.04], [0, 1.48, 0.042], [0, 1.56, 0.07], behindEyes])));
  for (const s of [1, -1]) lines.push(line(4, smooth([behindEyes, [s * 0.02, 1.618, 0.115], [s * 0.032, 1.625, 0.132]]), undefined, s > 0 ? 'l' : 'r'));
  return {
    id: 'tsalung',
    title: 'Tsa lung',
    inner: true,
    groups: [
      { chip: 'central', name: 'The central channel — dbu ma', course: 'Straight and hollow, in the centre of the body, from the crown to four finger-widths below the navel.' },
      {
        chip: 'right',
        name: 'The right channel — ro ma',
        course: 'Beside the central channel on the right. Joined to it below the navel, it rises to the crown, coiling around it at each wheel, and curves down to the right nostril.',
      },
      { chip: 'left', name: 'The left channel — rkyang ma', course: 'Beside the central channel on the left, coiling the other way, to the left nostril.' },
      {
        chip: 'wheels',
        name: 'The four wheels — ’khor lo',
        course: 'Wheels of spokes at the crown, the throat, the heart and the navel, where the side channels knot the central one — tightest at the heart. The coils are drawn schematically; some systems add a fifth wheel, at the secret place.',
      },
      { chip: 'kati', name: 'The kati channel — ka ti', course: 'In Dzogchen: a hollow, crystal channel from the heart to the eyes.' },
    ],
    points,
    lines,
  };
}

/* ---------- Daoist internal alchemy. ---------- */

/**
 * The orbit runs up the back midline and down the front: `back` and `front`
 * are reference points just inside the skin along the Governor vessel
 * (tailbone to upper lip) and the Conception vessel (chin to perineum).
 */
export function daoistMap(back: Vec3[], front: Vec3[]): InnerMapData {
  return {
    id: 'orbit',
    title: 'Microcosmic orbit',
    inner: true,
    groups: [
      {
        chip: 'orbit',
        cjk: '小周天',
        name: 'The microcosmic orbit — xiǎo zhōutiān',
        hanzi: '小周天',
        course: 'Breath-energy circulated up the Governor vessel along the spine and over the head, then down the Conception vessel in front — a circuit the manuals say opens over years, and is not to be forced.',
      },
      { chip: 'dantian', cjk: '丹田', name: 'The three dantian', hanzi: '丹田', course: 'The three fields of the elixir, in which the work is done: in the belly, the chest and the head.' },
    ],
    points: [
      place(1, [0, 1.012, 0.07], 2, 'dantian · the lower field', 'Xià dāntián  下丹田', 'the lower field of the elixir', 'In the belly below the navel, a third of the way in from the front: the root of the breath.'),
      place(1, [0, 1.33, 0.04], 2, 'dantian · the middle field', 'Zhōng dāntián  中丹田', 'the middle field', 'In the chest, at the level of the heart.'),
      place(1, [0, 1.645, 0.08], 2, 'dantian · the upper field', 'Shàng dāntián  上丹田', 'the upper field', 'In the head, behind the brow.'),
    ],
    lines: [{ group: 0, side: 'm', path: path([...back, ...front, back[0]], 0.01) }],
  };
}
