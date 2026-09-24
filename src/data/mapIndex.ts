/**
 * The maps offered in the atlas, grouped by tradition. Ready maps are drawn
 * by the viewer (see AtlasScene.ensureMap); the rest are listed as to come.
 * Only one map is shown at a time.
 */
export interface MapEntry {
  id: string;
  name: string;
  ready: boolean;
  /** How many there are, for the list (e.g. "361"). */
  count?: string;
  /** What the map is, for the card before anything is hovered. */
  intro?: string;
}

export interface MapGroup {
  tradition: string;
  maps: MapEntry[];
}

export const MAP_GROUPS: MapGroup[] = [
  {
    tradition: 'Chinese medicine',
    maps: [
      {
        id: 'meridians',
        name: 'Channels and points',
        ready: true,
        count: '361',
        intro:
          'The twelve primary channels and the two midline vessels, with their 361 points, placed by the WHO standard (2008). Move over the body: each point’s name, its place and the anatomy beneath it appear here.',
      },
      {
        id: 'sinew',
        name: 'Sinew channels and their knots',
        ready: true,
        count: '12',
        intro:
          'The sinew channels (jīng jīn, 經筋) of the Ling Shu, chapter 13: broad bands along the muscles that bind (結) at the joints and bony prominences — a classical map of where the fascia is anchored. Courses simplified to their main lines.',
      },
    ],
  },
  {
    tradition: 'Medicine',
    maps: [
      {
        id: 'trigger-points',
        name: 'Trigger points',
        ready: true,
        count: '45',
        intro:
          'The usual trigger-point regions of 45 muscles, after Travell and Simons. Move over one: the muscle, where it refers pain, and the anatomy beneath it.',
      },
      { id: 'tender-points', name: 'Tender points (1990)', ready: false },
      { id: 'dermatomes', name: 'Dermatomes', ready: false },
      { id: 'anatomy-trains', name: 'Myofascial lines', ready: false },
    ],
  },
  {
    tradition: 'The fascia',
    maps: [
      { id: 'attachments', name: 'Attachment lines', ready: false },
      { id: 'fasciae', name: 'Named fasciae', ready: false },
    ],
  },
  {
    tradition: 'Daoist alchemy',
    maps: [
      { id: 'orbit', name: 'Microcosmic orbit', ready: false },
      { id: 'dantian', name: 'Three dantian', ready: false },
    ],
  },
  {
    tradition: 'Yoga · tantra',
    maps: [
      { id: 'chakras', name: 'Cakras · nāḍīs', ready: false },
      { id: 'granthis', name: 'Granthis — the three knots', ready: false },
      { id: 'kundalini', name: 'Kuṇḍalinī', ready: false },
    ],
  },
  {
    tradition: 'Tibetan',
    maps: [
      { id: 'tsalung', name: 'Tsa lung — channels & knots', ready: false },
      { id: 'kati', name: 'Kati channel (Dzogchen)', ready: false },
    ],
  },
];

export const mapById = (id: string) => MAP_GROUPS.flatMap((g) => g.maps.map((m) => ({ ...m, tradition: g.tradition }))).find((m) => m.id === id);
