import type { Locator } from '../anchors/locate';
import { MERIDIANS } from './meridians';
import { back, below } from './place';

/**
 * The twelve sinew channels (jīng jīn, 經筋) of the Ling Shu, chapter 13:
 * broad bands running along the muscles from the tips of the fingers and
 * toes toward the trunk and head, which do not enter the organs and have no
 * points of their own. Their defining feature is that they bind (結, jié) at
 * the joints and bony prominences — a classical map of the places where the
 * fascia is anchored.
 *
 * Each channel is a list of stops, placed on the same landmarks as the
 * acupoints; the stops that are knots are named. Courses are simplified to
 * their main lines, and most side branches are left out.
 */
export interface SinewStop {
  at: Locator;
  /** A knot (結): where the channel binds, and an optional note. */
  knot?: string;
  note?: string;
}

export interface SinewDef {
  code: string;
  name: string;
  hanzi: string;
  course: string;
  lines: SinewStop[][];
}

const ACU = new Map<string, Locator>(MERIDIANS.flatMap((m) => m.points.map((p) => [`${m.code}${p.n}`, p.at] as [string, Locator])));
const acu = (code: string): Locator => {
  const l = ACU.get(code);
  if (!l) throw new Error(`unknown acupoint ${code}`);
  return l;
};
/** A stop on a point's landmark. */
const s = (code: string): SinewStop => ({ at: acu(code) });
/** A knot on a point's landmark. */
const k = (code: string, knot: string, note?: string): SinewStop => ({ at: acu(code), knot, note });

export const SINEWS: SinewDef[] = [
  {
    code: 'LU',
    name: 'Sinew channel of the hand, greater yin',
    hanzi: '手太陰之筋',
    course: 'From the thumb, up the front of the forearm and arm into the armpit, over the front of the shoulder and the hollow above the collarbone, into the chest and down to the lower ribs.',
    lines: [
      [s('LU11'), k('LU10', 'Behind the thenar eminence, at the base of the thumb'), s('LU9'), s('LU7'), k('LU5', 'In the crease of the elbow'), s('LU4'), s('LU3'), k('LI15', 'The front of the shoulder'), k('ST12', 'The hollow above the collarbone'), k('LU1', 'Inside the chest, below the collarbone'), s('LR13')],
    ],
  },
  {
    code: 'LI',
    name: 'Sinew channel of the hand, yang brightness',
    hanzi: '手陽明之筋',
    course: 'From the index finger, up the outer forearm and arm to the point of the shoulder, then up the neck and cheek to the corner of the head.',
    lines: [[s('LI1'), k('LI5', 'The wrist'), s('LI6'), s('LI10'), k('LI11', 'The outer elbow'), s('LI14'), k('LI15', 'The point of the shoulder'), s('LI17'), s('LI18'), k('SI18', 'The cheekbone'), s('ST8')]],
  },
  {
    code: 'ST',
    name: 'Sinew channel of the foot, yang brightness',
    hanzi: '足陽明之筋',
    course: 'From the middle toes, up the front of the leg and thigh, over the abdomen and chest to the collarbone, up the neck and face to beside the nose and below the eye; a branch binds in front of the ear.',
    lines: [
      [s('ST45'), k('ST42', 'The top of the foot'), s('ST41'), s('ST38'), s('ST36'), k('ST35', 'The knee'), s('ST34'), s('ST32'), k('ST31', 'The front of the hip'), k('ST30', 'The genitals, where the sinews gather'), s('ST25'), s('ST19'), k('ST12', 'The hollow above the collarbone'), s('ST9'), s('ST5'), s('ST4'), k('ST3', 'The cheekbone'), k('LI20', 'Beside the nose'), s('ST1')],
      [s('ST3'), s('ST6'), k('ST7', 'In front of the ear')],
    ],
  },
  {
    code: 'SP',
    name: 'Sinew channel of the foot, greater yin',
    hanzi: '足太陰之筋',
    course: 'From the big toe, up the inside of the leg and thigh to the groin, over the abdomen to the navel, the ribs and the chest.',
    lines: [[s('SP1'), s('SP3'), k('SP5', 'The inner ankle'), s('SP6'), k('SP9', 'The inner knee'), s('SP10'), s('SP11'), k('SP12', 'The groin, at the top of the thigh'), k('KI11', 'The genitals, where the sinews gather'), k('KI16', 'The navel'), k('LR14', 'The ribs'), s('SP20')]],
  },
  {
    code: 'HT',
    name: 'Sinew channel of the hand, lesser yin',
    hanzi: '手少陰之筋',
    course: 'From the little finger, up the inner forearm and arm into the armpit, across the chest inside the breast, and down to the navel.',
    lines: [[s('HT9'), k('HT7', 'The pisiform bone, at the wrist'), s('HT4'), k('HT3', 'The inner elbow'), s('HT2'), s('HT1'), k('KI23', 'The chest, inside the breast'), s('KI16')]],
  },
  {
    code: 'SI',
    name: 'Sinew channel of the hand, greater yang',
    hanzi: '手太陽之筋',
    course: 'From the little finger, up the back of the forearm and arm, around the shoulder blade, up the neck to behind the ear, over the ear to the jaw and the outer corner of the eye.',
    lines: [
      [
        s('SI1'),
        k('SI5', 'The wrist'),
        s('SI7'),
        k('SI8', 'Behind the inner elbow bone', 'The text adds: “flick it and it answers at the little finger” — the ulnar nerve, at the funny bone.'),
        k('SI9', 'Below the armpit, at its back fold'),
        s('SI10'),
        s('SI11'),
        s('SI14'),
        s('SI16'),
        k('GB12', 'Behind the ear, on the mastoid'),
        s('TE20'),
        k('SI17', 'The jaw'),
        s('GB1'),
      ],
    ],
  },
  {
    code: 'BL',
    name: 'Sinew channel of the foot, greater yang',
    hanzi: '足太陽之筋',
    course: 'From the little toe, up the back of the leg and thigh to the buttock, up beside the spine to the nape, over the head to the forehead and the nose; branches bind at the shoulder and behind the ear.',
    lines: [
      [
        s('BL67'),
        k('BL60', 'The outer ankle'),
        k('BL61', 'The heel'),
        s('BL59'),
        s('BL57'),
        k('BL40', 'Behind the knee'),
        s('BL37'),
        k('BL54', 'The buttock'),
        s('BL28'),
        s('BL23'),
        s('BL17'),
        s('BL11'),
        k('BL10', 'The nape'),
        k('BL9', 'The occipital bone'),
        s('BL7'),
        s('BL5'),
        s('BL3'),
        k('BL1', 'Beside the nose, at the inner corner of the eye'),
        s('BL2'),
      ],
      [s('SI9'), k('LI15', 'The point of the shoulder')],
      [s('ST12'), k('GB12', 'Behind the ear, on the mastoid')],
    ],
  },
  {
    code: 'KI',
    name: 'Sinew channel of the foot, lesser yin',
    hanzi: '足少陰之筋',
    course: 'From the sole, behind the inner ankle to the heel, up the inside of the leg and thigh to the genitals, then within the spine to the nape and the occipital bone. (It runs inside the spine; it is drawn beside it.)',
    lines: [
      [
        s('KI1'),
        s('KI2'),
        k('KI5', 'The heel'),
        s('KI7'),
        k('KI10', 'Below the inner knee'),
        s('LR10'),
        k('KI11', 'The genitals, where the sinews gather'),
        s('CV1'),
        { at: back(below('L4'), 0.5) },
        { at: back(below('T7'), 0.5) },
        { at: back(below('C7'), 0.5) },
        k('BL9', 'The occipital bone, where it joins the foot greater yang'),
      ],
    ],
  },
  {
    code: 'PC',
    name: 'Sinew channel of the hand, reverting yin',
    hanzi: '手心主之筋',
    course: 'From the middle finger, up the middle of the inner forearm and arm to below the armpit, spreading over the ribs; a branch enters the chest to bind at the diaphragm.',
    lines: [
      [s('PC9'), s('PC8'), s('PC7'), s('PC6'), s('PC4'), k('PC3', 'The inner elbow'), s('PC2'), k('GB22', 'Below the armpit'), s('SP21')],
      [s('PC2'), s('PC1'), k('KI21', 'The diaphragm, below the breastbone')],
    ],
  },
  {
    code: 'TE',
    name: 'Sinew channel of the hand, lesser yang',
    hanzi: '手少陽之筋',
    course: 'From the ring finger, up the back of the forearm and arm, over the shoulder and up the neck, around the jaw and in front of the ear to the outer corner of the eye and the corner of the forehead.',
    lines: [[s('TE1'), k('TE4', 'The wrist'), s('TE5'), s('TE9'), k('TE10', 'The elbow'), s('TE12'), s('TE13'), s('TE14'), s('TE15'), s('TE16'), s('ST6'), s('TE21'), s('GB1'), k('ST8', 'The corner of the forehead')]],
  },
  {
    code: 'GB',
    name: 'Sinew channel of the foot, lesser yang',
    hanzi: '足少陽之筋',
    course: 'From the fourth toe, up the outer leg and thigh, over the flank and ribs to the chest and the collarbone, behind the ear to the corner of the forehead, and down to the outer corner of the eye and the cheekbone; a branch binds at the sacrum.',
    lines: [
      [s('GB44'), s('GB41'), k('GB40', 'The outer ankle'), s('GB39'), s('GB34'), k('GB33', 'The outer knee'), s('GB32'), s('GB31'), k('ST31', 'Above the front of the thigh'), s('GB28'), s('GB25'), s('GB22'), s('ST16'), k('ST12', 'The hollow above the collarbone'), s('GB12'), s('GB8'), k('ST8', 'The corner of the forehead'), s('GB14'), k('GB1', 'The outer corner of the eye'), k('SI18', 'The cheekbone')],
      [s('GB31'), s('GB30'), k('BL29', 'The sacrum')],
    ],
  },
  {
    code: 'LR',
    name: 'Sinew channel of the foot, reverting yin',
    hanzi: '足厥陰之筋',
    course: 'From the big toe, in front of the inner ankle, up the shin and the inner thigh to the genitals, where it joins all the sinews.',
    lines: [[s('LR1'), s('LR2'), s('LR3'), k('LR4', 'In front of the inner ankle'), s('LR5'), k('LR7', 'Below the inner knee'), s('LR9'), s('LR10'), s('LR11'), k('LR12', 'The genitals, where it joins all the sinews')]],
  },
];
