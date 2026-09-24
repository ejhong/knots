import type { Locator } from '../anchors/locate';

/**
 * Roots: the source vessels whose trees feed the skin, placed where their
 * trunks come up into the superficial layer. Territories grown from these
 * points approximate Taylor & Palmer's angiosomes (1987).
 *
 * Written for the figure's left side; `bilateral` entries are mirrored.
 * Locators are skeletal (see anchors/locate.ts). Region names group roots
 * for the UI and for scenarios.
 */
export interface RootDef {
  id: string;
  name: string;
  region: 'head' | 'neck' | 'trunk' | 'back' | 'pelvis' | 'arm' | 'leg';
  /** Where the trunk enters the sheet, in atlas language. */
  note: string;
  bilateral: boolean;
  at: Locator;
  /** Marks the gates the essay names: roots at attachment lines. */
  gate?: boolean;
}

export const ROOTS: RootDef[] = [
  // Head — "on the order of ten trunks enter the sheet of the head".
  {
    id: 'occipital',
    name: 'Occipital artery · greater occipital nerve',
    region: 'head',
    note: 'Emerges through the deep fascia between trapezius and sternocleidomastoid at the superior nuchal line, a few centimetres lateral to the external occipital protuberance. The root of the posterior scalp.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'head', o: [0.028, 0.035, 0.0] }, dir: [0.32, 0.1, -1] },
  },
  {
    id: 'posterior-auricular',
    name: 'Posterior auricular',
    region: 'head',
    note: 'Behind the ear over the mastoid, beside the parotid — the Wind Screen (Yifeng, TE17) region.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'head', o: [0.03, 0.045, -0.01] }, dir: [1, 0.05, -0.75] },
  },
  {
    id: 'superficial-temporal',
    name: 'Superficial temporal',
    region: 'head',
    note: 'Rises in front of the ear over the root of the zygomatic arch to the temple.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'head', o: [0.03, 0.09, 0.03] }, dir: [1, 0.45, 0.4] },
  },
  {
    id: 'supraorbital',
    name: 'Supraorbital',
    region: 'head',
    note: 'Leaves the orbit at the supraorbital notch; the front root of the galea.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'l-eye', o: [0.004, 0.022, -0.035] }, dir: [0.12, 0.55, 1] },
  },
  {
    id: 'supratrochlear',
    name: 'Supratrochlear',
    region: 'head',
    note: 'Medial brow, a finger-width from the midline.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'l-eye', o: [-0.016, 0.024, -0.035] }, dir: [0.02, 0.5, 1] },
  },
  {
    id: 'angular',
    name: 'Angular (facial)',
    region: 'head',
    note: 'The facial artery’s end beside the nose.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'l-eye', o: [-0.012, -0.03, -0.02] }, dir: [0.45, -0.1, 1] },
  },
  {
    id: 'facial',
    name: 'Facial',
    region: 'head',
    note: 'Crosses the mandible at the front edge of the masseter.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'jaw', o: [0.03, 0.01, -0.035] }, dir: [1, -0.35, 0.35] },
  },

  // Neck
  {
    id: 'deep-cervical',
    name: 'Deep cervical',
    region: 'neck',
    note: 'Paraspinal perforators of the back of the neck, upstream of the occipital gate.',
    bilateral: true,
    at: { ray: { mid: ['neck', 'head'], o: [0.018, -0.01, 0.0] }, dir: [0.35, 0, -1] },
  },
  {
    id: 'transverse-cervical',
    name: 'Transverse cervical',
    region: 'neck',
    note: 'Posterior triangle of the neck, above the clavicle.',
    bilateral: true,
    at: { ray: { j: 'neck', o: [0.035, 0.025, 0.0] }, dir: [1, 0.25, -0.3] },
  },
  {
    id: 'superior-thyroid',
    name: 'Anterior cervical',
    region: 'neck',
    note: 'Front of the neck beside the airway, where the platysma lies.',
    bilateral: true,
    at: { ray: { j: 'neck', o: [0.018, 0.045, 0.02] }, dir: [0.4, 0, 1] },
  },

  // Shoulder girdle and chest
  {
    id: 'thoracoacromial',
    name: 'Thoracoacromial',
    region: 'trunk',
    note: 'Below the clavicle in the deltopectoral region.',
    bilateral: true,
    at: { ray: { j: 'l-clavicle', o: [0.07, -0.06, 0.0] }, dir: [0.15, 0.1, 1] },
  },
  {
    id: 'internal-thoracic',
    name: 'Internal thoracic',
    region: 'trunk',
    note: 'Parasternal perforators in the upper intercostal spaces.',
    bilateral: true,
    at: { ray: { j: 'spine-1', o: [0.025, 0.07, 0.0] }, dir: [0.12, 0, 1] },
  },
  {
    id: 'lateral-thoracic',
    name: 'Lateral thoracic',
    region: 'trunk',
    note: 'Side of the chest at the anterior axillary line.',
    bilateral: true,
    at: { ray: { j: 'spine-1', o: [0.06, -0.01, 0.02] }, dir: [1, -0.05, 0.35] },
  },
  {
    id: 'superior-epigastric',
    name: 'Superior epigastric',
    region: 'trunk',
    note: 'Upper abdomen below the costal margin, paramedian.',
    bilateral: true,
    at: { ray: { j: 'spine-2', o: [0.04, -0.01, 0.0] }, dir: [0.18, 0, 1] },
  },
  {
    id: 'deep-inferior-epigastric',
    name: 'Deep inferior epigastric',
    region: 'trunk',
    note: 'The periumbilical perforators surgeons harvest for the DIEP flap.',
    bilateral: true,
    at: { ray: { j: 'spine-4', o: [0.035, -0.025, 0.0] }, dir: [0.15, 0, 1] },
  },
  {
    id: 'superficial-inferior-epigastric',
    name: 'Superficial inferior epigastric',
    region: 'trunk',
    note: 'Lower abdomen above the middle of the inguinal ligament.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'pelvis', o: [0.06, 0.045, 0.0] }, dir: [0.25, 0.1, 1] },
  },
  {
    id: 'circumflex-iliac',
    name: 'Circumflex iliac',
    region: 'trunk',
    note: 'Over the anterior iliac spine, at the lateral end of the inguinal ligament.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'pelvis', o: [0.1, 0.07, 0.0] }, dir: [0.8, 0.05, 0.65] },
  },

  // Back
  {
    id: 'suprascapular',
    name: 'Suprascapular',
    region: 'back',
    note: 'Over the supraspinous fossa of the shoulder blade.',
    bilateral: true,
    at: { ray: { j: 'l-scapula', o: [0.03, -0.01, 0.0] }, dir: [0.2, 0.35, -1] },
  },
  {
    id: 'circumflex-scapular',
    name: 'Circumflex scapular',
    region: 'back',
    note: 'The triangular space at the lateral border of the shoulder blade.',
    bilateral: true,
    at: { ray: { j: 'l-shoulder', o: [-0.045, -0.1, 0.0] }, dir: [0.35, 0, -1] },
  },
  {
    id: 'posterior-intercostal',
    name: 'Posterior intercostal (dorsal rami)',
    region: 'back',
    note: 'The paraspinal rows of the thoracic back.',
    bilateral: true,
    at: { ray: { j: 'spine-1', o: [0.03, -0.06, 0.0] }, dir: [0.25, 0, -1] },
  },
  {
    id: 'thoracodorsal',
    name: 'Thoracodorsal',
    region: 'back',
    note: 'Latissimus dorsi, at the side of the back.',
    bilateral: true,
    at: { ray: { j: 'spine-2', o: [0.06, 0.04, 0.0] }, dir: [1, 0, -0.6] },
  },
  {
    id: 'lumbar',
    name: 'Lumbar',
    region: 'back',
    note: 'Paraspinal lumbar perforators through the thoracolumbar fascia.',
    bilateral: true,
    at: { ray: { j: 'spine-3', o: [0.03, -0.02, 0.0] }, dir: [0.3, 0, -1] },
  },
  {
    id: 'cluneal',
    name: 'Superior cluneal nerves',
    region: 'back',
    note: 'Where the cluneal nerves pierce the thoracolumbar fascia at the iliac crest — a recognised entrapment, and one of the roots the essay names.',
    bilateral: true,
    gate: true,
    at: { ray: { j: 'spine-4', o: [0.07, -0.05, 0.0] }, dir: [0.45, 0, -1] },
  },

  // Pelvis
  {
    id: 'superior-gluteal',
    name: 'Superior gluteal',
    region: 'pelvis',
    note: 'Upper buttock.',
    bilateral: true,
    at: { ray: { j: 'pelvis', o: [0.07, 0.03, 0.0] }, dir: [0.35, 0.15, -1] },
  },
  {
    id: 'inferior-gluteal',
    name: 'Inferior gluteal',
    region: 'pelvis',
    note: 'Lower buttock, above the gluteal fold.',
    bilateral: true,
    at: { ray: { j: 'pelvis', o: [0.07, -0.07, 0.0] }, dir: [0.2, -0.15, -1] },
  },

  // Thigh
  {
    id: 'lateral-circumflex-femoral',
    name: 'Lateral circumflex femoral',
    region: 'leg',
    note: 'The anterolateral thigh perforators.',
    bilateral: true,
    at: { ray: { lerp: ['l-upper-leg', 'l-knee', 0.5] }, dir: [0.85, 0, 0.55] },
  },
  {
    id: 'profunda-femoris',
    name: 'Profunda femoris',
    region: 'leg',
    note: 'Back of the thigh.',
    bilateral: true,
    at: { ray: { lerp: ['l-upper-leg', 'l-knee', 0.45] }, dir: [0.15, 0, -1] },
  },
  {
    id: 'medial-circumflex-femoral',
    name: 'Medial circumflex femoral',
    region: 'leg',
    note: 'Inner upper thigh.',
    bilateral: true,
    at: { ray: { lerp: ['l-upper-leg', 'l-knee', 0.28] }, dir: [-1, 0, 0.15] },
  },
  {
    id: 'superficial-femoral',
    name: 'Superficial femoral',
    region: 'leg',
    note: 'Front of the thigh along sartorius.',
    bilateral: true,
    at: { ray: { lerp: ['l-upper-leg', 'l-knee', 0.62] }, dir: [-0.35, 0, 1] },
  },
  {
    id: 'descending-genicular',
    name: 'Descending genicular (saphenous)',
    region: 'leg',
    note: 'Inner knee.',
    bilateral: true,
    at: { ray: { j: 'l-knee', o: [0, 0.04, 0] }, dir: [-1, 0, 0.25] },
  },

  // Leg
  {
    id: 'popliteal',
    name: 'Popliteal',
    region: 'leg',
    note: 'Back of the knee.',
    bilateral: true,
    at: { ray: { j: 'l-knee', o: [0, -0.015, 0] }, dir: [0, 0, -1] },
  },
  {
    id: 'sural',
    name: 'Sural',
    region: 'leg',
    note: 'The calf.',
    bilateral: true,
    at: { ray: { lerp: ['l-knee', 'l-ankle', 0.3] }, dir: [0.1, 0, -1] },
  },
  {
    id: 'anterior-tibial',
    name: 'Anterior tibial',
    region: 'leg',
    note: 'Front and outer shin.',
    bilateral: true,
    at: { ray: { lerp: ['l-knee', 'l-ankle', 0.45] }, dir: [0.55, 0, 0.85] },
  },
  {
    id: 'peroneal',
    name: 'Peroneal',
    region: 'leg',
    note: 'Outer leg.',
    bilateral: true,
    at: { ray: { lerp: ['l-knee', 'l-ankle', 0.55] }, dir: [1, 0, -0.25] },
  },
  {
    id: 'posterior-tibial',
    name: 'Posterior tibial',
    region: 'leg',
    note: 'Inner leg, lower third.',
    bilateral: true,
    at: { ray: { lerp: ['l-knee', 'l-ankle', 0.62] }, dir: [-1, 0, -0.1] },
  },
  {
    id: 'dorsalis-pedis',
    name: 'Dorsalis pedis',
    region: 'leg',
    note: 'Top of the foot.',
    bilateral: true,
    at: { ray: { lerp: ['l-ankle', 'l-foot-1', 0.55] }, dir: [0, 1, 0.25] },
  },
  {
    id: 'plantar',
    name: 'Plantar',
    region: 'leg',
    note: 'The sole.',
    bilateral: true,
    at: { ray: { lerp: ['l-ankle', 'l-foot-1', 0.45] }, dir: [0, -1, 0] },
  },

  // Arm (A-pose: the arm hangs out and down; directions are in body axes)
  {
    id: 'brachial',
    name: 'Brachial',
    region: 'arm',
    note: 'Inner upper arm.',
    bilateral: true,
    at: { ray: { lerp: ['l-shoulder', 'l-elbow', 0.5] }, dir: [-0.7, -0.62, 0.35] },
  },
  {
    id: 'profunda-brachii',
    name: 'Profunda brachii',
    region: 'arm',
    note: 'Back and outer upper arm.',
    bilateral: true,
    at: { ray: { lerp: ['l-shoulder', 'l-elbow', 0.55] }, dir: [0.55, 0.45, -0.7] },
  },
  {
    id: 'posterior-circumflex-humeral',
    name: 'Posterior circumflex humeral',
    region: 'arm',
    note: 'Over the deltoid.',
    bilateral: true,
    at: { ray: { lerp: ['l-shoulder', 'l-elbow', 0.12] }, dir: [0.7, 0.6, -0.3] },
  },
  {
    id: 'radial',
    name: 'Radial',
    region: 'arm',
    note: 'Thumb side of the forearm.',
    bilateral: true,
    at: { ray: { lerp: ['l-elbow', 'l-hand', 0.55] }, dir: [0.3, 0.5, 0.8] },
  },
  {
    id: 'ulnar',
    name: 'Ulnar',
    region: 'arm',
    note: 'Little-finger side of the forearm.',
    bilateral: true,
    at: { ray: { lerp: ['l-elbow', 'l-hand', 0.5] }, dir: [-0.6, -0.5, 0.2] },
  },
  {
    id: 'posterior-interosseous',
    name: 'Posterior interosseous',
    region: 'arm',
    note: 'Back of the forearm.',
    bilateral: true,
    at: { ray: { lerp: ['l-elbow', 'l-hand', 0.45] }, dir: [0.45, 0.2, -0.9] },
  },
];
