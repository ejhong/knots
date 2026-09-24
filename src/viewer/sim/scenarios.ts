import type { AtlasScene } from '../AtlasScene';

/**
 * Aggravations and reliefs. Each scenario raises sympathetic drive in the
 * zones it loads; knots swell and multiply over sim-minutes. Lifting the
 * scenario removes the drive but not the knots — the collar remembers.
 */
export interface Scenario {
  id: string;
  label: string;
  note: string;
  zones: Record<string, number>;
  global?: number;
  warmth?: number;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'back-ache',
    label: 'Back ache',
    note: 'Low back loaded all day: the lumbar rows, the iliac crest where the cluneal nerves come through, the buttock.',
    zones: { lumbar: 0.62, 'iliac-crest': 0.7, thoracolumbar: 0.45, gluteal: 0.5, sacrum: 0.4, 'lateral-hip': 0.3 },
  },
  {
    id: 'desk-neck',
    label: 'Desk neck',
    note: 'Forward head, raised shoulders: the base of the skull, the upper trapezius, the levator, the chest.',
    zones: { suboccipital: 0.6, 'nuchal-ridge': 0.55, 'upper-trapezius': 0.62, levator: 0.55, rhomboid: 0.4, pectoral: 0.35, forearm: 0.3 },
  },
  {
    id: 'headache',
    label: 'Tension headache',
    note: 'The ridge and its partners — occiput, temples, jaw, brow.',
    zones: { suboccipital: 0.65, 'nuchal-ridge': 0.65, temple: 0.55, jaw: 0.5, brow: 0.4, scm: 0.4 },
  },
  {
    id: 'anxious',
    label: 'Anxious',
    note: 'The brace muscles — jaw, throat, diaphragm, belly — and a body-wide rise in sympathetic tone.',
    zones: { jaw: 0.5, throat: 0.55, diaphragm: 0.55, belly: 0.4, pectoral: 0.35, 'upper-trapezius': 0.4 },
    global: 0.22,
  },
  {
    id: 'cold',
    label: 'Cold',
    note: 'Cold constricts the skin’s vessels everywhere; the constriction outlasts the cold.',
    zones: {},
    global: 0.45,
  },
];

export function applyScenario(scene: AtlasScene, s: Scenario, strength = 1) {
  const sim = scene.sim;
  for (const z of scene.zoneCenters) {
    const amt = s.zones[z.id];
    if (!amt) continue;
    for (let k = 0; k < z.nodes.length; k++) {
      const i = z.nodes[k];
      sim.stress[i] = Math.min(0.9, Math.max(sim.stress[i], amt * z.weights[k] * strength));
    }
  }
  if (s.global) sim.globalStress = Math.max(sim.globalStress, s.global * strength);
}
