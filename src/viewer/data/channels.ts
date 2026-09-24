import type { Locator } from '../anchors/locate';

/**
 * The deep channels: the connective-tissue planes of the deep fascia —
 * intermuscular septa, raphes, and the sheaths that carry the main vessels
 * and nerves. Where the superficial fascia is one continuous plane under the
 * skin, the deep fascia is channel-like: sleeves, walls and grooves.
 * Septocutaneous perforators travel up these walls, and Langevin & Yandow
 * (2002) found acupuncture channels running along exactly these planes —
 * which is why they are drawn: to be laid against the traditional maps.
 *
 * Each channel is a path of skin landmarks (drawn on the deep fascia beneath
 * them). Paths are approximate surface projections of deep structures.
 * Written for the figure's left side; `bilateral` entries are mirrored.
 */
export type ChannelKind = 'septum' | 'sheath' | 'raphe';

export interface ChannelDef {
  id: string;
  name: string;
  kind: ChannelKind;
  note: string;
  bilateral: boolean;
  path: Locator[];
}

const back = (j: string, x: number, y = 0): Locator => ({ ray: { j, o: [x, y, 0] }, dir: [x * 2, 0, -1] });
const front = (j: string, x: number, y = 0): Locator => ({ ray: { j, o: [x, y, 0] }, dir: [x * 2, 0, 1] });

export const CHANNELS: ChannelDef[] = [
  // Midline raphes.
  {
    id: 'nuchal-ligament',
    name: 'Nuchal ligament',
    kind: 'raphe',
    note: 'The midline seam of the back of the neck, from the occipital protuberance to C7 — the posterior anchor of the superficial layers.',
    bilateral: false,
    path: [
      { ray: { j: 'head', o: [0, 0.04, 0] }, dir: [0, 0.15, -1] },
      { ray: { j: 'head', o: [0, -0.03, 0] }, dir: [0, 0, -1] },
      { ray: { j: 'neck', o: [0, 0.01, 0] }, dir: [0, 0.1, -1] },
    ],
  },
  {
    id: 'supraspinous',
    name: 'Supraspinous line · thoracolumbar raphe',
    kind: 'raphe',
    note: 'The midline of the back over the spinous processes, where the thoracolumbar fascia of the two sides meets.',
    bilateral: false,
    path: [back('neck', 0, 0.01), back('spine-1', 0, 0.05), back('spine-1', 0, -0.05), back('spine-2', 0), back('spine-3', 0), back('spine-4', 0), back('pelvis', 0, 0.02)],
  },
  {
    id: 'sternal',
    name: 'Sternal midline',
    kind: 'raphe',
    note: 'The front of the chest over the sternum, where the pectoral fasciae of the two sides meet.',
    bilateral: false,
    path: [front('neck', 0, -0.02), front('spine-1', 0, 0.1), front('spine-1', 0, 0), front('spine-2', 0, 0.06)],
  },
  {
    id: 'linea-alba',
    name: 'Linea alba',
    kind: 'raphe',
    note: 'The white line of the abdomen, from xiphoid to pubis — the fused aponeuroses of the abdominal muscles.',
    bilateral: false,
    path: [front('spine-2', 0, 0.05), front('spine-3', 0, 0), front('spine-4', 0, -0.01), front('pelvis', 0, 0.02), { ray: { j: 'pelvis', o: [0, -0.04, 0] }, dir: [0, -0.35, 1] }],
  },

  // Trunk.
  {
    id: 'linea-semilunaris',
    name: 'Linea semilunaris',
    kind: 'septum',
    note: 'The curved lateral border of the rectus sheath, from the costal margin to the pubic tubercle.',
    bilateral: true,
    path: [front('spine-2', 0.075, 0.05), front('spine-3', 0.078, 0), front('spine-4', 0.074, -0.02), { ray: { j: 'pelvis', o: [0.04, -0.03, 0] }, dir: [0.15, -0.3, 1] }],
  },
  {
    id: 'erector-border',
    name: 'Lateral raphe of the thoracolumbar fascia',
    kind: 'raphe',
    note: 'The lateral border of the erector spinae, where the layers of the thoracolumbar fascia fuse; the cluneal nerves pierce near its lower end.',
    bilateral: true,
    path: [back('spine-1', 0.06, -0.02), back('spine-2', 0.065), back('spine-3', 0.07), back('spine-4', 0.075), back('pelvis', 0.07, 0.07)],
  },
  {
    id: 'deltopectoral',
    name: 'Deltopectoral groove',
    kind: 'sheath',
    note: 'Between deltoid and pectoralis major, carrying the cephalic vein from the arm toward the clavicle.',
    bilateral: true,
    path: [
      { near: { j: 'l-clavicle', o: [0.1, -0.02, 0.03] }, dir: [0, 0.3, 1] },
      { near: { j: 'l-shoulder', o: [-0.03, -0.04, 0.04] }, dir: [-0.1, 0, 1] },
      { near: { j: 'l-shoulder', o: [-0.02, -0.075, 0.05] }, dir: [-0.2, 0, 1] },
    ],
  },

  // Neck.
  {
    id: 'carotid-sheath',
    name: 'Carotid sheath (anterior border of SCM)',
    kind: 'sheath',
    note: 'The sheath of the common carotid artery, internal jugular vein and vagus nerve, beneath the front edge of sternocleidomastoid.',
    bilateral: true,
    path: [
      { near: { j: 'jaw', o: [0.042, -0.02, -0.06] }, dir: [1, -0.2, 0.3] },
      { ray: { mid: ['neck', 'head'], o: [0.025, 0, 0] }, dir: [0.6, 0, 0.8] },
      { ray: { j: 'neck', o: [0.012, 0.01, 0] }, dir: [0.25, 0, 1] },
    ],
  },
  {
    id: 'scm-posterior',
    name: 'Posterior border of SCM',
    kind: 'septum',
    note: 'Where the skin nerves of the neck emerge from the deep fascia (Erb’s point, midway down).',
    bilateral: true,
    path: [
      { ray: { j: 'head', o: [0.045, 0.02, -0.02] }, dir: [1, 0, -0.4] },
      { ray: { mid: ['neck', 'head'], o: [0.04, 0, -0.01] }, dir: [1, 0, -0.1] },
      { ray: { j: 'neck', o: [0.05, 0.0, 0.0] }, dir: [0.8, 0.4, 0.3] },
    ],
  },
  {
    id: 'trapezius-anterior',
    name: 'Anterior border of trapezius',
    kind: 'septum',
    note: 'The front edge of trapezius, from the occiput to the outer clavicle; the occipital artery emerges near its top.',
    bilateral: true,
    path: [
      { ray: { j: 'head', o: [0.035, 0.03, 0] }, dir: [0.55, 0.1, -1] },
      { ray: { mid: ['neck', 'head'], o: [0.045, 0, 0] }, dir: [1, 0, -0.7] },
      { ray: { lerp: ['neck', 'l-shoulder', 0.55], o: [0, 0.03, 0] }, dir: [0.2, 1, 0.2] },
    ],
  },

  // Arm.
  {
    id: 'arm-medial-septum',
    name: 'Medial intermuscular septum of the arm',
    kind: 'sheath',
    note: 'The medial bicipital groove: brachial artery, basilic vein and the median and ulnar nerves run along it.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-shoulder', 'l-elbow', 0.12] }, dir: [-0.7, -0.62, 0.35] },
      { ray: { lerp: ['l-shoulder', 'l-elbow', 0.55] }, dir: [-0.7, -0.62, 0.35] },
      { ray: { lerp: ['l-shoulder', 'l-elbow', 0.95] }, dir: [-0.72, -0.58, 0.3] },
    ],
  },
  {
    id: 'arm-lateral-septum',
    name: 'Lateral intermuscular septum of the arm',
    kind: 'septum',
    note: 'Between triceps and brachialis; the radial nerve and profunda brachii pierce it above the elbow.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-shoulder', 'l-elbow', 0.42] }, dir: [0.7, 0.62, -0.3] },
      { ray: { lerp: ['l-shoulder', 'l-elbow', 0.97] }, dir: [0.7, 0.62, -0.25] },
    ],
  },
  {
    id: 'radial-bundle',
    name: 'Radial neurovascular channel',
    kind: 'sheath',
    note: 'Between brachioradialis and flexor carpi radialis — the radial artery, to the pulse at the wrist.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-elbow', 'l-hand', 0.08] }, dir: [0.1, 0.3, 1] },
      { ray: { lerp: ['l-elbow', 'l-hand', 0.5] }, dir: [0.25, 0.45, 0.85] },
      { ray: { lerp: ['l-elbow', 'l-hand', 0.93] }, dir: [0.3, 0.5, 0.8] },
    ],
  },
  {
    id: 'ulnar-bundle',
    name: 'Ulnar neurovascular channel',
    kind: 'sheath',
    note: 'Beneath flexor carpi ulnaris — the ulnar artery and nerve, to the wrist.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-elbow', 'l-hand', 0.15] }, dir: [-0.55, -0.45, 0.6] },
      { ray: { lerp: ['l-elbow', 'l-hand', 0.93] }, dir: [-0.6, -0.5, 0.45] },
    ],
  },
  {
    id: 'interosseous-dorsal',
    name: 'Posterior interosseous channel',
    kind: 'sheath',
    note: 'Down the back of the forearm between the extensor groups.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-elbow', 'l-hand', 0.12] }, dir: [0.45, 0.2, -0.9] },
      { ray: { lerp: ['l-elbow', 'l-hand', 0.92] }, dir: [0.45, 0.25, -0.85] },
    ],
  },

  // Thigh.
  {
    id: 'thigh-lateral-septum',
    name: 'Lateral intermuscular septum · iliotibial tract',
    kind: 'septum',
    note: 'The outer thigh, from the greater trochanter to the knee; perforators of the profunda come through it.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.06] }, dir: [1, 0.1, -0.25] },
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.5] }, dir: [1, 0, -0.25] },
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.95] }, dir: [1, 0, -0.2] },
    ],
  },
  {
    id: 'adductor-canal',
    name: 'Femoral sheath · adductor canal',
    kind: 'sheath',
    note: 'From the femoral triangle under sartorius toward the back of the knee — the femoral artery and vein and the saphenous nerve.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.05] }, dir: [-0.15, 0.1, 1] },
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.4] }, dir: [-0.6, 0, 0.8] },
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.78] }, dir: [-1, 0, 0.1] },
    ],
  },
  {
    id: 'thigh-posterior',
    name: 'Posterior thigh (sciatic line)',
    kind: 'sheath',
    note: 'Between the hamstrings, where the sciatic nerve descends to the knee.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.12] }, dir: [0.1, 0, -1] },
      { ray: { lerp: ['l-upper-leg', 'l-knee', 0.9] }, dir: [0.05, 0, -1] },
    ],
  },

  // Leg.
  {
    id: 'popliteal-sural',
    name: 'Popliteal · sural channel',
    kind: 'sheath',
    note: 'Through the back of the knee and down the calf — the tibial vessels deep, the sural nerve and small saphenous vein superficial.',
    bilateral: true,
    path: [
      { ray: { j: 'l-knee', o: [0, 0.03, 0] }, dir: [0, 0, -1] },
      { ray: { lerp: ['l-knee', 'l-ankle', 0.45] }, dir: [0.05, 0, -1] },
      { ray: { lerp: ['l-knee', 'l-ankle', 0.88] }, dir: [0.2, 0, -1] },
    ],
  },
  {
    id: 'leg-anterior-septum',
    name: 'Anterior intermuscular septum of the leg',
    kind: 'septum',
    note: 'Between the anterior and lateral compartments; the superficial peroneal nerve pierces the fascia along it.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-knee', 'l-ankle', 0.12] }, dir: [0.85, 0, 0.5] },
      { ray: { lerp: ['l-knee', 'l-ankle', 0.88] }, dir: [0.75, 0, 0.65] },
    ],
  },
  {
    id: 'leg-posterior-septum',
    name: 'Posterior intermuscular septum of the leg',
    kind: 'septum',
    note: 'Between the lateral and posterior compartments, behind the fibula; peroneal perforators come through it.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-knee', 'l-ankle', 0.12] }, dir: [1, 0, -0.45] },
      { ray: { lerp: ['l-knee', 'l-ankle', 0.9] }, dir: [0.85, 0, -0.55] },
    ],
  },
  {
    id: 'tibial-medial',
    name: 'Posterior tibial channel',
    kind: 'sheath',
    note: 'The inner leg beside the tibia, to behind the medial malleolus — the posterior tibial artery and tibial nerve.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-knee', 'l-ankle', 0.2] }, dir: [-1, 0, -0.1] },
      { ray: { lerp: ['l-knee', 'l-ankle', 0.97] }, dir: [-1, 0, -0.45] },
    ],
  },
  {
    id: 'anterior-tibial',
    name: 'Anterior tibial channel',
    kind: 'sheath',
    note: 'Down the front of the leg beside tibialis anterior, onto the top of the foot as the dorsalis pedis.',
    bilateral: true,
    path: [
      { ray: { lerp: ['l-knee', 'l-ankle', 0.15] }, dir: [0.35, 0, 1] },
      { ray: { lerp: ['l-knee', 'l-ankle', 0.9] }, dir: [0.2, 0, 1] },
      { ray: { lerp: ['l-ankle', 'l-foot-1', 0.55] }, dir: [0, 1, 0.25] },
    ],
  },
];
