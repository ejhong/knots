import type { Locator, Vec3 } from '../anchors/locate';
import { at, back, fa, flank, front, lg, limb, nav, th, ua } from './place';

/**
 * Where the integrated trigger-point hypothesis finds knots: in taut bands of
 * the muscles Travell and Simons mapped, grouped by muscle. Each entry is the
 * centre of a muscle's usual trigger-point region, the direction its fibres
 * run (for the taut band, left side, figure coordinates), how many candidate
 * sites to scatter there, how far, and how deep under the deep fascia.
 * Representative, after The Trigger Point Manual; not a clinical map.
 */
export interface TriggerCluster {
  muscle: string;
  /** 0 head and neck · 1 shoulder and arm · 2 trunk · 3 hip and leg. */
  region: number;
  /** Where its trigger points refer pain, after Travell and Simons. */
  refers: string;
  at: Locator;
  dir: Vec3;
  n: number;
  spread: number;
  /** Depth below the deep fascia (m). */
  deep: number;
}

/** Limb axes on the reference pose, for fibres that run along a limb. */
const UA: Vec3 = [0.66, -0.75, 0];
const FA: Vec3 = [0.52, -0.5, 0.74];
const TH: Vec3 = [0.1, -0.99, 0.08];
const LG: Vec3 = [0.1, -0.99, -0.03];

export const TRIGGER_REGIONS = ['Head and neck', 'Shoulder and arm', 'Trunk', 'Hip and leg'];

let region = 0;
const c = (muscle: string, at: Locator, dir: Vec3, n: number, spread = 0.025, deep = 0.008): TriggerCluster => ({
  muscle,
  region,
  refers: REFERS[muscle] ?? '',
  at,
  dir,
  n,
  spread,
  deep,
});
const next = () => (region += 1);

/** Referred pain, in brief. */
const REFERS: Record<string, string> = {
  Temporalis: 'the temple, the eyebrow and the upper teeth',
  Masseter: 'the jaw, the teeth, the ear and the eyebrow',
  Sternocleidomastoid: 'the head — the forehead, around the eye, behind the ear',
  'Splenius capitis': 'the top of the head',
  'Upper trapezius': 'up the side of the neck to behind the ear and the temple',
  'Levator scapulae': 'the angle of the neck and along the inner border of the shoulder blade',
  Scalenes: 'the chest, the shoulder blade, and down the arm to the thumb and index finger',
  Supraspinatus: 'the shoulder, and down the outer arm to the elbow',
  Infraspinatus: 'deep in the front of the shoulder, and down the arm',
  'Teres major and minor': 'the back of the shoulder and arm',
  Rhomboids: 'along the inner border of the shoulder blade',
  'Middle trapezius': 'between the shoulder blades',
  'Lower trapezius': 'the neck and the top of the shoulder blade',
  Deltoid: 'the shoulder, around the muscle itself',
  Biceps: 'the front of the shoulder',
  Triceps: 'the back of the arm and the elbow',
  Brachioradialis: 'the outer elbow and the web of the thumb',
  'Wrist and finger extensors': 'the outer elbow, the forearm and the back of the hand',
  'Wrist and finger flexors': 'the palm and the fingers',
  'First dorsal interosseous': 'the side of the index finger',
  'Pectoralis major': 'the chest and the front of the shoulder, and down the inner arm',
  'Pectoralis minor': 'the front of the shoulder, and down the inner arm',
  'Serratus anterior': 'the side of the chest and below the shoulder blade',
  'Rectus abdominis': 'across the back at the same level, and the abdomen',
  'External oblique': 'the upper abdomen and the chest',
  'Thoracic paraspinals': 'along the spine, and around to the chest or abdomen',
  'Lumbar paraspinals and multifidi': 'the low back and the buttock',
  'Quadratus lumborum': 'the hip, the buttock and the sacroiliac joint',
  'Gluteus maximus': 'the buttock and the tailbone',
  'Gluteus medius': 'the low back, the sacrum and the buttock',
  'Gluteus minimus': 'down the side and back of the leg to the ankle, like sciatica',
  Piriformis: 'the buttock and the back of the thigh',
  'Tensor fasciae latae': 'the outer hip, and down the outer thigh',
  'Rectus femoris': 'the front of the knee',
  'Vastus lateralis': 'the outer thigh and knee',
  'Vastus medialis': 'the inner knee',
  Adductors: 'the groin and the inner thigh',
  Hamstrings: 'the back of the thigh and the knee',
  Gastrocnemius: 'the calf, the back of the knee and the instep',
  'Gastrocnemius, lateral head': 'the back of the knee and the calf',
  Soleus: 'the heel',
  'Tibialis anterior': 'the front of the ankle and the big toe',
  'Peroneus longus': 'the outer ankle',
  'Foot, plantar muscles': 'the sole and the heel',
  'Extensor digitorum longus': 'the top of the foot',
};

export const TRIGGER_CLUSTERS: TriggerCluster[] = [
  // Head and neck.
  c('Temporalis', at(0.07, 1.66, 0.06, [1, 0.2, 0.3]), [0, 1, 0], 10, 0.02, 0.004),
  c('Masseter', at(0.058, 1.55, 0.07, [1, 0, 0.35]), [0, 1, 0.2], 8, 0.015, 0.005),
  c('Sternocleidomastoid', at(0.05, 1.49, 0.04, [1, 0, 0.5]), [-0.4, -1, 0.3], 10, 0.02, 0.005),
  c('Splenius capitis', back(1.52, 1.6), [0.3, 1, 0], 6, 0.015, 0.006),
  c('Upper trapezius', { near: { lerp: ['neck', 'l-shoulder', 0.45] }, dir: [0, 1, 0] }, [1, -0.2, 0], 16, 0.03, 0.006),
  c('Levator scapulae', back(1.42, 3.0, 0.3), [0.3, 1, 0], 8, 0.018, 0.012),
  c('Scalenes', at(0.045, 1.46, 0.02, [1, 0, 0.2]), [0.2, -1, 0.1], 6, 0.012, 0.008),
  // Shoulder and arm.
  (next(), c('Supraspinatus', back(1.405, 4.0, 0.3), [1, 0, 0], 6, 0.018, 0.012)),
  c('Infraspinatus', back(1.34, 4.2), [1, 0.2, 0], 12, 0.035, 0.01),
  c('Teres major and minor', back(1.31, 5.0), [1, 0.4, 0], 6, 0.02, 0.01),
  c('Rhomboids', back(1.35, 2.2), [1, -0.6, 0], 8, 0.025, 0.012),
  c('Middle trapezius', back(1.39, 2.5), [1, 0, 0], 6, 0.02, 0.006),
  c('Lower trapezius', back(1.3, 2.6), [0.6, 1, 0], 6, 0.025, 0.006),
  c('Deltoid', ua(1.5, 90), UA, 8, 0.03, 0.01),
  c('Biceps', ua(5, 20), UA, 6, 0.02, 0.01),
  c('Triceps', ua(5, 200), UA, 8, 0.03, 0.012),
  c('Brachioradialis', fa(10, 90), FA, 5, 0.015, 0.008),
  c('Wrist and finger extensors', fa(9, 150), FA, 10, 0.025, 0.008),
  c('Wrist and finger flexors', fa(9, 330), FA, 8, 0.025, 0.008),
  c('First dorsal interosseous', limb('hand', 0.5, 150), [0, -0.3, 1], 3, 0.006, 0.004),
  // Trunk.
  (next(), c('Pectoralis major', front(1.33, 4.5), [1, 0.1, 0], 12, 0.035, 0.008)),
  c('Pectoralis minor', front(1.37, 3.8), [0.4, 1, 0], 4, 0.015, 0.02),
  c('Serratus anterior', flank(1.27, 0.3), [0.2, 1, 0.8], 6, 0.02, 0.006),
  c('Rectus abdominis', front(nav(2), 1.2), [0, 1, 0], 8, 0.04, 0.008),
  c('External oblique', front(nav(1), 3.8), [0.5, -1, 0.5], 6, 0.03, 0.006),
  c('Thoracic paraspinals', back(1.25, 1.8), [0, 1, 0], 12, 0.05, 0.015),
  c('Lumbar paraspinals and multifidi', back(1.1, 1.4), [0, 1, 0], 10, 0.035, 0.02),
  c('Quadratus lumborum', back(1.09, 3.0), [0.2, 1, 0], 8, 0.025, 0.03),
  // Hip and leg.
  (next(), c('Gluteus maximus', back(0.92, 3.5), [1, -0.6, 0], 12, 0.04, 0.015)),
  c('Gluteus medius', back(1.0, 4.4), [0.4, -1, 0], 10, 0.03, 0.015),
  c('Gluteus minimus', flank(0.96, -0.2), [0.2, -1, 0], 6, 0.02, 0.025),
  c('Piriformis', back(0.93, 2.6), [1, -0.3, 0], 5, 0.02, 0.035),
  c('Tensor fasciae latae', limb('thigh', 0.06, 60), TH, 4, 0.015, 0.008),
  c('Rectus femoris', th(14, 5), TH, 5, 0.02, 0.01),
  c('Vastus lateralis', th(8, 80), TH, 14, 0.04, 0.012),
  c('Vastus medialis', th(4, 310), TH, 6, 0.02, 0.01),
  c('Adductors', th(13, 280), TH, 8, 0.03, 0.012),
  c('Hamstrings', th(9, 185), TH, 12, 0.04, 0.015),
  c('Gastrocnemius', lg(5, 200), LG, 8, 0.025, 0.01),
  c('Gastrocnemius, lateral head', lg(5, 160), LG, 5, 0.02, 0.01),
  c('Soleus', lg(10, 180), LG, 6, 0.025, 0.015),
  c('Tibialis anterior', lg(4, 15), LG, 6, 0.025, 0.012),
  c('Peroneus longus', lg(4, 95), LG, 5, 0.02, 0.01),
  c('Foot, plantar muscles', limb('foot', 0.5, 190), [0, 0, 1], 4, 0.012, 0.006),
  c('Extensor digitorum longus', lg(6, 60), LG, 4, 0.02, 0.012),
];
