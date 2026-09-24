import type { Locator } from '../anchors/locate';

/**
 * Where knots gather. The original essay's census predicts "stress
 * concentrators and startle muscles": the junction zones (cervicothoracic,
 * thoracolumbar, lumbosacral, hip), the anti-gravity chain, and the brace
 * muscles — jaw, throat, diaphragm, belly, pelvic floor. The perforator
 * essay adds the roots at the ridges: the occipital gate, the cluneal nerves
 * at the iliac crest, the motor points around the shoulder blade.
 *
 * `w` is relative susceptibility; `r` the radius of influence (m).
 */
export interface ZoneDef {
  id: string;
  name: string;
  at: Locator;
  r: number;
  w: number;
  bilateral: boolean;
}

export const KNOT_ZONES: ZoneDef[] = [
  { id: 'suboccipital', name: 'Base of the skull', at: { ray: { j: 'head', o: [0.025, 0.01, 0] }, dir: [0.35, -0.1, -1] }, r: 0.045, w: 1.0, bilateral: true },
  { id: 'nuchal-ridge', name: 'Superior nuchal line', at: { ray: { j: 'head', o: [0.035, 0.04, 0] }, dir: [0.4, 0.15, -1] }, r: 0.035, w: 0.9, bilateral: true },
  { id: 'upper-trapezius', name: 'Upper trapezius', at: { ray: { lerp: ['neck', 'l-shoulder', 0.55], o: [0, 0.02, 0] }, dir: [0.1, 1, -0.35] }, r: 0.055, w: 0.95, bilateral: true },
  { id: 'levator', name: 'Levator scapulae', at: { ray: { j: 'neck', o: [0.035, 0.0, 0] }, dir: [0.5, 0.2, -1] }, r: 0.04, w: 0.8, bilateral: true },
  { id: 'rhomboid', name: 'Medial border of the shoulder blade', at: { ray: { j: 'spine-1', o: [0.06, 0.06, 0] }, dir: [0.25, 0, -1] }, r: 0.05, w: 0.75, bilateral: true },
  { id: 'infraspinatus', name: 'Shoulder blade', at: { ray: { j: 'spine-1', o: [0.1, 0.03, 0] }, dir: [0.35, 0, -1] }, r: 0.05, w: 0.6, bilateral: true },
  { id: 'thoracolumbar', name: 'Thoracolumbar junction', at: { ray: { j: 'spine-2', o: [0.035, -0.03, 0] }, dir: [0.2, 0, -1] }, r: 0.06, w: 0.65, bilateral: true },
  { id: 'lumbar', name: 'Low back', at: { ray: { j: 'spine-4', o: [0.04, 0.01, 0] }, dir: [0.2, 0, -1] }, r: 0.06, w: 0.75, bilateral: true },
  { id: 'iliac-crest', name: 'Iliac crest (cluneal nerves)', at: { ray: { j: 'spine-4', o: [0.075, -0.05, 0] }, dir: [0.5, 0.05, -1] }, r: 0.05, w: 0.9, bilateral: true },
  { id: 'sacrum', name: 'Sacrum', at: { ray: { j: 'pelvis', o: [0.02, 0.04, 0] }, dir: [0.1, 0.1, -1] }, r: 0.045, w: 0.5, bilateral: true },
  { id: 'gluteal', name: 'Buttock (piriformis)', at: { ray: { j: 'pelvis', o: [0.08, -0.02, 0] }, dir: [0.35, 0, -1] }, r: 0.06, w: 0.6, bilateral: true },
  { id: 'lateral-hip', name: 'Outer hip', at: { ray: { j: 'l-upper-leg', o: [0.02, 0.03, 0] }, dir: [1, 0.1, 0] }, r: 0.06, w: 0.55, bilateral: true },
  { id: 'it-band', name: 'Outer thigh', at: { ray: { lerp: ['l-upper-leg', 'l-knee', 0.55] }, dir: [1, 0, -0.1] }, r: 0.06, w: 0.35, bilateral: true },
  { id: 'calf', name: 'Calf', at: { ray: { lerp: ['l-knee', 'l-ankle', 0.3] }, dir: [0, 0, -1] }, r: 0.05, w: 0.4, bilateral: true },
  { id: 'sole', name: 'Sole', at: { ray: { lerp: ['l-ankle', 'l-foot-1', 0.6] }, dir: [0, -1, 0] }, r: 0.035, w: 0.3, bilateral: true },
  { id: 'jaw', name: 'Jaw (masseter)', at: { ray: { j: 'jaw', o: [0.04, 0.035, -0.03] }, dir: [1, 0, 0.25] }, r: 0.025, w: 0.6, bilateral: true },
  { id: 'temple', name: 'Temple', at: { ray: { j: 'head', o: [0.03, 0.1, 0.03] }, dir: [1, 0.2, 0.35] }, r: 0.03, w: 0.5, bilateral: true },
  { id: 'brow', name: 'Brow', at: { ray: { j: 'l-eye', o: [0, 0.03, -0.03] }, dir: [0.1, 0.5, 1] }, r: 0.022, w: 0.35, bilateral: true },
  { id: 'scm', name: 'Side of the neck (SCM)', at: { ray: { j: 'neck', o: [0.02, 0.05, 0] }, dir: [0.8, 0, 0.6] }, r: 0.03, w: 0.45, bilateral: true },
  { id: 'throat', name: 'Throat', at: { ray: { j: 'neck', o: [0, 0.04, 0] }, dir: [0, 0, 1] }, r: 0.03, w: 0.4, bilateral: false },
  { id: 'pectoral', name: 'Chest (pectoral)', at: { ray: { j: 'l-clavicle', o: [0.05, -0.08, 0] }, dir: [0.2, 0.1, 1] }, r: 0.06, w: 0.35, bilateral: true },
  { id: 'diaphragm', name: 'Diaphragm (upper belly)', at: { ray: { j: 'spine-2', o: [0, 0.02, 0] }, dir: [0, 0, 1] }, r: 0.06, w: 0.35, bilateral: false },
  { id: 'belly', name: 'Belly', at: { ray: { j: 'spine-4', o: [0, -0.02, 0] }, dir: [0, 0, 1] }, r: 0.06, w: 0.25, bilateral: false },
  { id: 'forearm', name: 'Forearm extensors', at: { ray: { lerp: ['l-elbow', 'l-hand', 0.25] }, dir: [0.45, 0.35, -0.8] }, r: 0.04, w: 0.35, bilateral: true },
];
