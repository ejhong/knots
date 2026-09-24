/**
 * The overlay maps offered in the atlas, grouped by tradition. `color` is a
 * CSS custom property name from tokens.css (traditional Japanese colours).
 * `ready` flips as each map's data lands in src/viewer/maps/.
 */
export interface MapEntry {
  id: string;
  name: string;
  color: string;
  ready: boolean;
}

export interface MapGroup {
  tradition: string;
  maps: MapEntry[];
}

export const MAP_GROUPS: MapGroup[] = [
  {
    tradition: 'The fascia',
    maps: [
      { id: 'attachments', name: 'Attachment lines', color: 'silver', ready: false },
      { id: 'fasciae', name: 'Named fasciae', color: 'silver', ready: false },
    ],
  },
  {
    tradition: 'Chinese medicine',
    maps: [
      { id: 'meridians', name: 'Channels and points', color: 'fuji', ready: true },
      { id: 'sinew', name: 'Sinew channels & their knots', color: 'moegi', ready: false },
    ],
  },
  {
    tradition: 'Daoist alchemy',
    maps: [
      { id: 'orbit', name: 'Microcosmic orbit', color: 'yamabuki', ready: false },
      { id: 'dantian', name: 'Three dantian', color: 'yamabuki', ready: false },
    ],
  },
  {
    tradition: 'Yoga · Tantra',
    maps: [
      { id: 'chakras', name: 'Cakras · nāḍīs', color: 'fuji', ready: false },
      { id: 'granthis', name: 'Granthis — the three knots', color: 'fuji', ready: false },
      { id: 'kundalini', name: 'Kuṇḍalinī', color: 'fuji', ready: false },
    ],
  },
  {
    tradition: 'Tibetan',
    maps: [
      { id: 'tsalung', name: 'Tsa lung — channels & knots', color: 'toki', ready: false },
      { id: 'kati', name: 'Kati channel (Dzogchen)', color: 'toki', ready: false },
    ],
  },
  {
    tradition: 'Medicine',
    maps: [
      { id: 'trigger-points', name: 'Trigger points', color: 'yamabuki', ready: false },
      { id: 'tender-points', name: 'Tender points (1990)', color: 'toki', ready: false },
      { id: 'dermatomes', name: 'Dermatomes', color: 'ai', ready: false },
      { id: 'anatomy-trains', name: 'Myofascial lines', color: 'sabi', ready: false },
    ],
  },
];
