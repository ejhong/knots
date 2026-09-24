import type { Locator } from '../anchors/locate';
import { at, back, fa, flank, front, scalp, th } from './place';

/**
 * The eighteen tender points of the American College of Rheumatology's 1990
 * classification criteria for fibromyalgia (Wolfe et al., 1990): nine pairs,
 * each placed here by its definition. Pain on about 4 kg of pressure at 11
 * or more of the 18 was part of the diagnosis then; the 2010 criteria
 * dropped the count.
 */
export interface TenderPoint {
  name: string;
  /** The definition, as the criteria give it. */
  where: string;
  /** 0 upper body · 1 lower body. */
  group: number;
  at: Locator;
}

export const TENDER_GROUPS = ['Upper body', 'Lower body'];

export const TENDER_POINTS: TenderPoint[] = [
  { name: 'Occiput', where: 'At the suboccipital muscle insertions.', group: 0, at: scalp(210, 20) },
  { name: 'Low cervical', where: 'At the front of the spaces between the transverse processes of C5 to C7.', group: 0, at: at(0.036, 1.445, 0.035, [0.8, 0, 0.6]) },
  { name: 'Trapezius', where: 'At the midpoint of the upper border.', group: 0, at: { near: { lerp: ['neck', 'l-shoulder', 0.5] }, dir: [0, 1, 0] } },
  { name: 'Supraspinatus', where: 'At its origin, above the spine of the shoulder blade near the inner border.', group: 0, at: back(1.405, 2.6, 0.3) },
  { name: 'Second rib', where: 'At the second costochondral junction, just outside it on the upper surface.', group: 0, at: front(1.395, 2.4) },
  { name: 'Lateral epicondyle', where: '2 cm below the outer bump of the elbow.', group: 0, at: fa(11, 100) },
  { name: 'Gluteal', where: 'In the upper outer quadrant of the buttock, in the front fold of the muscle.', group: 1, at: back(0.97, 3.8) },
  { name: 'Greater trochanter', where: 'Behind the bony prominence at the side of the hip.', group: 1, at: flank(0.905, -0.35) },
  { name: 'Knee', where: 'At the inner fat pad, just above the joint line.', group: 1, at: th(1, 285) },
];
