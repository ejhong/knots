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
  | 'rolling'
  | 'nerve'
  | 'imaging'
  | 'acupuncture'
  | 'anatomy'
  | 'mind'
  | 'animals'
  | 'contemplative'
  | 'tradition'
  | 'critique'
  | 'safety'
  | 'history'
  | 'models';

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
    note: 'Where this atlas began: knots as perforators held stuck, the fascia as a second system, trees of vessels, the traditions, and experiments to test it.',
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
    // Title, author, date and DOI from the DataCite records of 10.5281/zenodo.23901649 (draft 1), 10.5281/zenodo.23925028
    // (draft 3) and 10.5281/zenodo.24376190 (draft 4); the URL is the concept DOI, which resolves to the latest version.
    id: 'jhong2026b',
    authors: 'Eugene Jhong (text by Claude Opus 5.5, refereed by Claude Fable 5.1; for draft 4, Claude Fable 5.2)',
    year: 2026,
    title: 'The perforator hypothesis: knots as small arteries held shut where they pierce the fascia',
    venue: 'Zenodo preprint, 2 November 2026; draft 4, 19 November 2026',
    url: 'https://doi.org/10.5281/zenodo.23901648',
    kind: 'paper',
    tags: ['essay', 'perforators', 'vascular', 'fascia'],
    note: 'The position paper: knots as cutaneous perforators held shut by their own walls, argued from established physiology alone, beside six alternatives, with runaway release and the fascia, the acupuncture points, the dangers and the measurements that would refute it.',
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
    note: 'For the galea, the SMAS, the superficial fascia and the fascial planes of the body.',
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
    note: 'The microcosmic orbit, and the patience it asks for.',
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
    note: 'The Kriya Yoga lineage, and its account of breath and the life-force.',
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
    note: 'Saṅkhāras felt as solidified sensations that dissolve under equanimous attention.',
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
    id: 'dn2',
    authors: 'Pāli Canon',
    year: -400,
    title: 'Sāmaññaphala Sutta (Dīgha Nikāya 2) — the fruits of the contemplative life',
    venue: 'Dīgha Nikāya',
    url: 'https://www.accesstoinsight.org/tipitaka/dn/dn.02.0.than.html',
    kind: 'text',
    tags: ['tradition', 'contemplative'],
    note: 'The similes of the jhānas: rapture and pleasure suffusing the whole body, as water kneaded into a ball of bath powder soaks it through.',
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
    // Religions is not indexed in PubMed: title, authors, venue and DOI from the Crossref record of 10.3390/rel12121042.
    id: 'cooper2021',
    authors: 'Cooper DJ, Lindahl JR, Palitsky R, Britton WB',
    year: 2021,
    title: '“Like a Vibration Cascading through the Body”: Energy-Like Somatic Experiences Reported by Western Buddhist Meditators',
    venue: 'Religions 12:1042',
    url: 'https://doi.org/10.3390/rel12121042',
    kind: 'paper',
    tags: ['contemplative', 'safety'],
    note: 'Energy-like somatic experiences in Western Buddhist meditators: how they are described, how they unfold and affect lives, how practitioners, teachers, doctors and therapists read them, and what helped.',
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
    note: 'Practices of release. Read the cautions first.',
  },

  // Foam rolling: what its teachers advise (Traditions, #rolling).
  {
    id: 'davies2013',
    authors: 'Clair Davies, Amber Davies',
    year: 2013,
    title: 'The Trigger Point Therapy Workbook: Your Self-Treatment Guide for Pain Relief',
    venue: 'New Harbinger Publications (3rd ed.)',
    kind: 'book',
    tags: ['rolling', 'trigger-points', 'safety'],
    note: 'The self-treatment workbook. Its third edition aims at a pain of 5 on a scale of 1 to 10, less than its earlier editions: “If you are grimacing or holding your breath, you are pressing too hard.” Never massage a pulse.',
  },
  {
    id: 'penney2021',
    authors: 'Stacey Penney',
    year: 2021,
    title: 'Foam Rolling and Self-Myofascial Release: The Trainer’s Application Guide',
    venue: 'National Academy of Sports Medicine (updated June 2026)',
    url: 'https://www.nasm.org/resource-center/blog/recovery/foam-rolling-and-self-myofascial-release-the-trainer-application-guide',
    kind: 'web',
    tags: ['rolling', 'safety'],
    note: 'A certifying body’s guide for trainers: discomfort of about 5 to 7 out of 10, never sharp pain or a breath-holding grimace; about 30 to 45 seconds on a tender spot; not over the lumbar spine, joints or acute injuries.',
  },
  {
    id: 'halvorson2016',
    authors: 'Ryan Halvorson',
    year: 2016,
    title: 'When Myofascial Release Gets Emotional',
    venue: 'IDEA Health & Fitness Association',
    url: 'https://www.ideafit.com/when-myofascial-release-gets-emotional/',
    kind: 'web',
    tags: ['rolling', 'safety'],
    note: 'Teachers of rolling, among them Sue Hitzmann and Jill Miller, on the tears that can come in a rolling class: they treat them as normal, keep rolling optional, and refer anyone who cries every time to a counsellor.',
  },
  {
    id: 'hitzmann2026',
    authors: 'Sue Hitzmann',
    year: 2026,
    title: 'Why Does Pain Persist? Revisiting the Brain–Body Connection',
    venue: 'MELT Method (written in 2012, revisited 2026)',
    url: 'https://www.meltmethod.com/blogs/articles/why-does-pain-persist-brain-body-connection',
    kind: 'web',
    tags: ['rolling'],
    note: 'From the creator of the MELT Method: “You can’t cause pain or self-inflict pain to get out of pain.” Intense direct pressure on sensitive spots does not seem to resolve them; consistency matters more than intensity.',
  },
  {
    id: 'jmiller2025',
    authors: 'Jill Miller, Andy Galpin',
    year: 2025,
    title: 'Jill Miller: Increase Flexibility & Relieve Pain with Breathwork & Myofascial Release',
    venue: 'Perform with Dr. Andy Galpin (podcast transcript)',
    url: 'https://www.performpodcast.com/episodes/jill-miller-increase-flexibility-relieve-pain-with-breathwork-myofascial-release/transcript/',
    kind: 'web',
    tags: ['rolling', 'breath'],
    note: 'The author of The Roll Model: rolling does not have to hurt to work.',
  },
  {
    id: 'jmiller2026',
    authors: 'Jill Miller, Shawn Stevenson',
    year: 2026,
    title: 'Use Your Breathing to Control Stress, Reduce Pain, & Much More',
    venue: 'The Model Health Show, episode 972 (transcript)',
    url: 'https://themodelhealthshow.s3.us-east-2.amazonaws.com/Episode+972.pdf',
    kind: 'web',
    tags: ['rolling', 'breath'],
    note: 'Contract-relax on a ball: a big breath in, held while the muscles around the ball contract, then out, letting go, again and again, until the muscle’s guarding quiets and the ball sinks in.',
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
  rolling: 'Foam rolling',
  nerve: 'Nerve',
  imaging: 'Imaging',
  acupuncture: 'Acupuncture',
  anatomy: 'Anatomy',
  mind: 'Mind',
  animals: 'Animals',
  contemplative: 'Contemplative',
  tradition: 'Traditions',
  critique: 'Critique',
  safety: 'Safety',
  history: 'History',
  models: 'Models',
};
