import papers from './papers.json';

/**
 * The library. Papers in papers.json were verified against PubMed
 * (titles, authors, venues, DOIs); books, classical texts and web sources
 * are listed below. Keys are cited from hypotheses.ts and the pages.
 *
 * Tags drive the library's filters.
 */
export type Tag =
  | 'essay'
  | 'perforators'
  | 'fascia'
  | 'vascular'
  | 'breath'
  | 'trigger-points'
  | 'nerve'
  | 'imaging'
  | 'acupuncture'
  | 'anatomy'
  | 'base-of-skull'
  | 'mind'
  | 'animals'
  | 'contemplative'
  | 'tradition'
  | 'critique'
  | 'safety'
  | 'history';

export interface Reference {
  id: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
  url?: string;
  pmid?: string;
  kind: 'paper' | 'book' | 'text' | 'web' | 'essay';
  tags: Tag[];
  note: string;
}

const EXTRA: Reference[] = [
  // The essays this site draws from.
  {
    id: 'jhong2026',
    authors: 'Eugene Jhong (text by Fable 5.1)',
    year: 2026,
    title: 'Knots of Existence Hypotheses',
    venue: 'Substack, 8 September 2026',
    url: 'https://ejhong.substack.com/p/knots-of-existence-hypotheses',
    kind: 'essay',
    tags: ['essay', 'perforators', 'fascia', 'contemplative'],
    note: 'The source of this site: knots as stuck perforators; the sheet as the second system; trees, gates, the base of the skull, the traditions, the experiments.',
  },
  {
    id: 'jhong2026a',
    authors: 'Eugene Jhong (text by Kimi and Fable)',
    year: 2026,
    title: 'Knots of Existence and Vasocomputation',
    venue: 'Substack, 14 August 2026',
    url: 'https://ejhong.substack.com/p/knots-of-existence-and-vasocomputation',
    kind: 'essay',
    tags: ['essay', 'vascular', 'contemplative'],
    note: 'The original: knots as a state, not a structure — “a stale lock file” — the two-key protocol of pressure and breath, and a research programme.',
  },
  {
    id: 'johnson2023',
    authors: 'Michael Edward Johnson',
    year: 2023,
    title: 'Principles of Vasocomputation: A Unification of Buddhist Phenomenology, Active Inference, and Physical Reflex (Part I)',
    venue: 'opentheory.net, 12 July 2023 (updated 2025)',
    url: 'https://opentheory.net/2023/07/principles-of-vasocomputation-a-unification-of-buddhist-phenomenology-active-inference-and-physical-reflex-part-i/',
    kind: 'essay',
    tags: ['essay', 'vascular', 'mind', 'contemplative'],
    note: 'Vascular smooth muscle as a computational medium: vasomotion compresses, contractions clamp, sustained contractions latch into hyperpriors; tanha as their felt signature.',
  },
  {
    id: 'johnson2024notes',
    authors: 'Michael Edward Johnson',
    year: 2024,
    title: 'Vasocomputation and vascular tension',
    venue: 'opentheory.net notes',
    url: 'https://opentheory.net/notes/vasocomputation-and-vascular-tension/',
    kind: 'essay',
    tags: ['essay', 'vascular', 'mind'],
    note: '“A sustained thought is a pattern of vascular clenching that reduces dynamic range in nearby neurons.”',
  },

  // Books — anatomy, fascia, trigger points.
  {
    id: 'travell1983',
    authors: 'Janet G. Travell, David G. Simons',
    year: 1983,
    title: 'Myofascial Pain and Dysfunction: The Trigger Point Manual',
    venue: 'Williams & Wilkins (2nd ed. 1999, with Lois S. Simons)',
    kind: 'book',
    tags: ['trigger-points', 'history'],
    note: 'The atlas of trigger points and referred-pain patterns.',
  },
  {
    id: 'guimberteau2015',
    authors: 'Jean-Claude Guimberteau, Colin Armstrong',
    year: 2015,
    title: 'Architecture of Human Living Fascia: The Extracellular Matrix and Cells Revealed Through Endoscopy',
    venue: 'Handspring Publishing',
    kind: 'book',
    tags: ['fascia', 'anatomy'],
    note: 'Living fascia filmed under the skin: a multimicrovacuolar web of fibrils that slides, stretches and recovers.',
  },
  {
    id: 'schleip2012',
    authors: 'Robert Schleip, Thomas W. Findley, Leon Chaitow, Peter A. Huijing (eds.)',
    year: 2012,
    title: 'Fascia: The Tensional Network of the Human Body',
    venue: 'Churchill Livingstone Elsevier',
    kind: 'book',
    tags: ['fascia'],
    note: 'The reference text of modern fascia research.',
  },
  {
    id: 'myers2001',
    authors: 'Thomas W. Myers',
    year: 2001,
    title: 'Anatomy Trains: Myofascial Meridians for Manual and Movement Therapists',
    venue: 'Churchill Livingstone (4th ed. 2020)',
    kind: 'book',
    tags: ['fascia'],
    note: 'Continuous lines of myofascia across the body — modern “meridians”.',
  },
  {
    id: 'stecco2004',
    authors: 'Luigi Stecco',
    year: 2004,
    title: 'Fascial Manipulation for Musculoskeletal Pain',
    venue: 'Piccin',
    kind: 'book',
    tags: ['fascia'],
    note: 'Centres of coordination and fusion; the clinical method behind the densification model.',
  },
  {
    id: 'gray2020',
    authors: 'Susan Standring (ed.)',
    year: 2020,
    title: 'Gray’s Anatomy: The Anatomical Basis of Clinical Practice, 42nd edition',
    venue: 'Elsevier',
    kind: 'book',
    tags: ['anatomy'],
    note: 'For the galea, the SMAS, the danger area of the scalp, and the fascial planes of the neck.',
  },

  // Chinese medicine and Daoist alchemy.
  {
    id: 'lingshu',
    authors: 'Anonymous (Han dynasty); tr. Wu Jing-Nuan',
    year: 1993,
    title: 'Ling Shu, or The Spiritual Pivot — chapter 13, “Jing Jin” (the sinew channels)',
    venue: 'The Taoist Center; University of Hawai‘i Press (2002)',
    kind: 'text',
    tags: ['tradition', 'acupuncture'],
    note: 'The twelve sinew channels, each of which “knots” (結, jié) at bony prominences; treated with heat at the painful spot.',
  },
  {
    id: 'who2008',
    authors: 'World Health Organization, Western Pacific Region',
    year: 2008,
    title: 'WHO Standard Acupuncture Point Locations in the Western Pacific Region',
    venue: 'WHO, Manila',
    kind: 'book',
    tags: ['tradition', 'acupuncture'],
    note: 'The standard for the 361 classical points and their proportional (cun) locations.',
  },
  {
    id: 'deadman1998',
    authors: 'Peter Deadman, Mazin Al-Khafaji, Kevin Baker',
    year: 1998,
    title: 'A Manual of Acupuncture',
    venue: 'Journal of Chinese Medicine Publications',
    kind: 'book',
    tags: ['tradition', 'acupuncture'],
    note: 'The standard English point reference, with classical names and indications.',
  },
  {
    id: 'wilhelm1931',
    authors: 'Richard Wilhelm (tr.), with a commentary by C. G. Jung',
    year: 1931,
    title: 'The Secret of the Golden Flower: A Chinese Book of Life',
    venue: 'Kegan Paul (German edition 1929)',
    kind: 'text',
    tags: ['tradition', 'contemplative'],
    note: 'Circulating the light: the Daoist meditation text that reached the West through Jung.',
  },
  {
    id: 'luk1970',
    authors: 'Lu K’uan Yü (Charles Luk)',
    year: 1970,
    title: 'Taoist Yoga: Alchemy and Immortality',
    venue: 'Rider',
    kind: 'text',
    tags: ['tradition', 'contemplative'],
    note: 'The microcosmic orbit and its three gates — the tailbone, the mid-spine, and the Jade Pillow at the occiput.',
  },
  {
    id: 'chia1983',
    authors: 'Mantak Chia',
    year: 1983,
    title: 'Awaken Healing Energy Through the Tao',
    venue: 'Aurora Press',
    kind: 'book',
    tags: ['tradition', 'contemplative'],
    note: 'A modern practical manual of the microcosmic orbit.',
  },

  // India: yoga, tantra, kuṇḍalinī.
  {
    id: 'avalon1919',
    authors: 'Arthur Avalon (Sir John Woodroffe)',
    year: 1919,
    title: 'The Serpent Power: The Ṣaṭ-cakra-nirūpaṇa and Pādukā-pañcaka',
    venue: 'Luzac & Co.',
    kind: 'text',
    tags: ['tradition', 'contemplative'],
    note: 'The classic English source on the cakras, the nāḍīs and kuṇḍalinī’s ascent through the knots.',
  },
  {
    id: 'hyp',
    authors: 'Svātmārāma (15th c.); tr. Brian Dana Akers',
    year: 2002,
    title: 'The Haṭha Yoga Pradīpikā',
    venue: 'YogaVidya.com',
    kind: 'text',
    tags: ['tradition', 'breath', 'contemplative'],
    note: 'Breath, the nāḍīs, and — in its fourth chapter — the piercing of the three granthis: Brahma, Viṣṇu and Rudra.',
  },
  {
    id: 'gopikrishna1967',
    authors: 'Gopi Krishna',
    year: 1967,
    title: 'Kundalini: The Evolutionary Energy in Man',
    venue: 'Ramadhar & Hopman; Shambhala (1970)',
    kind: 'book',
    tags: ['tradition', 'contemplative', 'safety'],
    note: 'A first-person account of an awakening gone wrong, and its long recovery.',
  },
  {
    id: 'yogananda1946',
    authors: 'Paramahansa Yogananda',
    year: 1946,
    title: 'Autobiography of a Yogi',
    venue: 'Philosophical Library',
    kind: 'book',
    tags: ['tradition', 'contemplative'],
    note: 'The Kriya lineage, which places the entry of the life-force at the medulla, at the base of the skull.',
  },

  // Tibet: tsa lung, Dzogchen, the rainbow body.
  {
    id: 'wangyal2011',
    authors: 'Tenzin Wangyal Rinpoche',
    year: 2011,
    title: 'Awakening the Sacred Body: Tibetan Yogas of Breath and Movement',
    venue: 'Hay House',
    kind: 'book',
    tags: ['tradition', 'breath', 'contemplative'],
    note: 'The three channels, the five winds, and the tsa lung movements that open them.',
  },
  {
    id: 'mullin1996',
    authors: 'Tsongkhapa; tr. Glenn H. Mullin',
    year: 1996,
    title: 'Tsongkhapa’s Six Yogas of Naropa',
    venue: 'Snow Lion',
    kind: 'text',
    tags: ['tradition', 'contemplative'],
    note: 'Inner heat and the untying of the channel-knots (rtsa mdud) where the side channels coil around the central channel.',
  },
  {
    id: 'norbu1986',
    authors: 'Chögyal Namkhai Norbu',
    year: 1986,
    title: 'The Crystal and the Way of Light: Sutra, Tantra and Dzogchen',
    venue: 'Routledge & Kegan Paul; Snow Lion (2000)',
    kind: 'book',
    tags: ['tradition', 'contemplative'],
    note: 'Dzogchen from the inside, including the rainbow body.',
  },
  {
    id: 'tiso2016',
    authors: 'Francis V. Tiso',
    year: 2016,
    title: 'Rainbow Body and Resurrection: Spiritual Attainment, the Dissolution of the Material Body, and the Case of Khenpo A Chö',
    venue: 'North Atlantic Books',
    kind: 'book',
    tags: ['tradition', 'contemplative'],
    note: 'An investigation of the rainbow body (’ja’ lus) — the tradition’s most extreme claim about the body at the end.',
  },

  // Buddhist practice and its hazards.
  {
    id: 'hart1987',
    authors: 'William Hart',
    year: 1987,
    title: 'The Art of Living: Vipassana Meditation as Taught by S. N. Goenka',
    venue: 'Harper & Row',
    kind: 'book',
    tags: ['tradition', 'contemplative'],
    note: 'Saṅkhāras felt as solidified sensations that dissolve under equanimous attention — “nearly word for word, the foam-rolling protocol”.',
  },
  {
    id: 'udana21',
    authors: 'Pāli Canon',
    year: -400,
    title: 'Mucalinda Sutta (Udāna 2.1)',
    venue: 'Khuddaka Nikāya',
    url: 'https://accesstoinsight.org/tipitaka/kn/ud/ud.2.01.than.html',
    kind: 'text',
    tags: ['tradition', 'contemplative'],
    note: 'After the awakening, a storm; the nāga king Mucalinda coils around the seated Buddha and spreads his hood above the head.',
  },
  {
    id: 'ingram2008',
    authors: 'Daniel M. Ingram',
    year: 2008,
    title: 'Mastering the Core Teachings of the Buddha',
    venue: 'Aeon Books (2nd ed. 2018; free online)',
    url: 'https://www.mctb.org/',
    kind: 'book',
    tags: ['contemplative', 'safety'],
    note: 'A practitioner’s map, including the difficult territory of intensive practice.',
  },
  {
    id: 'britton',
    authors: 'Willoughby Britton and colleagues',
    year: 2017,
    title: 'The Varieties of Contemplative Experience',
    venue: 'Brown University',
    url: 'https://sites.brown.edu/britton/research/the-varieties-of-contemplative-experience/',
    kind: 'web',
    tags: ['contemplative', 'safety'],
    note: 'The research programme on meditation-related difficulties.',
  },
  {
    id: 'cheetah',
    authors: 'Cheetah House',
    year: 2018,
    title: 'Support for meditators in difficulty',
    venue: 'cheetahhouse.org',
    url: 'https://www.cheetahhouse.org',
    kind: 'web',
    tags: ['safety', 'contemplative'],
    note: 'If a process is destabilising you, start here — and see a physician.',
  },
  {
    id: 'unclench',
    authors: 'Jonny Miller',
    year: 2026,
    title: 'How to Unclench: a field guide to the trainable skill of unclenching',
    venue: 'howtounclench.com',
    url: 'https://howtounclench.com/',
    kind: 'web',
    tags: ['contemplative', 'breath'],
    note: 'Practices of release, linked from the essay. Read the cautions first.',
  },
];

export const REFERENCES: Reference[] = [
  ...EXTRA,
  ...(papers as Omit<Reference, 'kind'>[]).map((p) => ({ ...p, kind: 'paper' as const, tags: p.tags as Tag[] })),
].sort((a, b) => a.year - b.year || a.authors.localeCompare(b.authors));

export const refById = (id: string) => REFERENCES.find((r) => r.id === id);

export const TAG_LABELS: Record<Tag, string> = {
  essay: 'Essays',
  perforators: 'Perforators',
  fascia: 'Fascia',
  vascular: 'Vessels',
  breath: 'Breath',
  'trigger-points': 'Trigger points',
  nerve: 'Nerve',
  imaging: 'Imaging',
  acupuncture: 'Acupuncture',
  anatomy: 'Anatomy',
  'base-of-skull': 'Base of the skull',
  mind: 'Mind',
  animals: 'Animals',
  contemplative: 'Contemplative',
  tradition: 'Traditions',
  critique: 'Critique',
  safety: 'Safety',
  history: 'History',
};
