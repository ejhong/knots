/**
 * The maps offered in the atlas, grouped by tradition. Ready maps are drawn
 * by the viewer (see AtlasScene.ensureMap): on the skin, or — the subtle body
 * of the contemplative traditions — inside it. The rest are listed as to
 * come. Only one map is shown at a time.
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
    tradition: 'Daoist alchemy',
    maps: [
      {
        id: 'orbit',
        name: 'Microcosmic orbit · dantian',
        ready: true,
        intro:
          'The microcosmic orbit (小周天) of Daoist internal alchemy — up the spine and over the head, down the front — and the three dantian, the fields in which the work is done. A map from the inside, drawn within the figure; not anatomy.',
      },
    ],
  },
  {
    tradition: 'Yoga · tantra',
    maps: [
      {
        id: 'chakras',
        name: 'Cakras · nāḍīs · granthis',
        ready: true,
        intro:
          'After the Ṣaṭ-cakra-nirūpaṇa: suṣumṇā within the spine, iḍā and piṅgalā beside it, the seven lotuses with their petals, and the three granthis — the knots. A map from the inside, drawn within the figure; not anatomy.',
      },
    ],
  },
  {
    tradition: 'Tibetan',
    maps: [
      {
        id: 'tsalung',
        name: 'Tsa lung — channels, wheels, knots',
        ready: true,
        intro:
          'After the Six Yogas of Nāropa: the central channel with the right and left beside it, the four wheels, and the channel-knots where the side channels coil around it; with the kati channel of Dzogchen. A map from the inside; not anatomy.',
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
      {
        id: 'tender-points',
        name: 'Tender points (1990)',
        ready: true,
        count: '18',
        intro:
          'The eighteen tender points of the American College of Rheumatology’s 1990 criteria for fibromyalgia (Wolfe et al.): nine pairs, placed by their definitions. Pain on about 4 kg of pressure at eleven or more was part of the diagnosis then; the 2010 criteria dropped the count.',
      },
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
];

export const mapById = (id: string) => MAP_GROUPS.flatMap((g) => g.maps.map((m) => ({ ...m, tradition: g.tradition }))).find((m) => m.id === id);
