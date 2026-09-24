/**
 * What is a knot? The candidate answers, side by side. One registry feeds
 * the atlas (hypothesis switcher), the Hypotheses page (cards and the
 * comparison table) and the library (via `refs`, keys into references.ts).
 *
 * Fields are written to be fair to each position: the strongest version,
 * its own best evidence, and its own sharpest test.
 */
export interface Hypothesis {
  id: string;
  name: string;
  /** Proponents, short form for the atlas list. */
  who: string;
  year: string;
  /** Colour token (CSS custom property value). */
  color: string;
  /** One line. */
  short: string;
  /** Where is the knot? */
  layer: string;
  /** What is it made of? */
  substance: string;
  /** What holds it? */
  holds: string;
  /** What releases it? */
  releases: string;
  timescale: string;
  /** Why breath works, on this view. */
  breath: string;
  /** Why knots seem to travel. */
  travel: string;
  /** Why knots accumulate with age. */
  age: string;
  /** Its sharpest test. */
  test: string;
  /** Where the evidence stands, in one honest sentence. */
  status: string;
  /** A few paragraphs, plain HTML allowed. */
  body: string[];
  refs: string[];
  /** Implemented in the atlas. */
  ready: boolean;
}

export const HYPOTHESES: Hypothesis[] = [
  {
    id: 'perforator',
    name: 'Perforators',
    who: 'Jhong 2026',
    year: '2026',
    color: '#ff5b3d',
    short: 'A knot is a perforator — artery, veins, nerve and lymphatic through a ring in the fascia — held stuck: vessel shut, collar gelled, nerve pressed.',
    layer: 'Where a neurovascular bundle pierces a fascia — the deep fascia for major perforators, the superficial fascia for the smaller ones.',
    substance: 'Three things in one bundle: a sympathetically constricted arteriole, a gelled hyaluronan collar, a compressed cutaneous nerve.',
    holds: 'A loop: constriction → ischaemia → acidic, cool, gelled collar → tether → sensitised nerve → sympathetic drive → constriction. Three memories at three timescales.',
    releases: 'Pressure as the address, the exhale as the permission: the vessel opens in seconds, the collar melts in minutes with warmth and shear, the nerve flashes — a star.',
    timescale: 'Seconds (vessel) · minutes (collar) · days to weeks (the sheet re-bonding).',
    breath: 'A deep inhale reflexly constricts skin arterioles within about two seconds; a slow exhale lets them open. The breath acts directly on the vessel that is the knot.',
    travel: 'Arterioles conduct: a dilation climbs the wall toward the feeding vessel at millimetres to centimetres a second, and a downstream vessel cannot stay open while its trunk is shut. Release queues at the roots — the ridges.',
    age: 'Cutaneous microvascular function declines and resting sympathetic tone rises with age; knots should rise with them, site by site. Children, whose perforators are open, should be nearly clean.',
    test: 'Blinded palpation versus a blinded pencil-Doppler map: do tender points sit on perforators? Then laser speckle at a release: a local perfusion flash on the exhale, absent at a sham site and during an inhale-hold.',
    status: 'Every link is ordinary physiology observed somewhere; the two new claims — the point is a perforator, and the state travels the tree — are untested.',
    body: [
      'The superficial fascia is pinned to the layer beneath in two ways: passive fibrous septa, and the places where something passes through — a small artery with its veins, a cutaneous nerve and a lymphatic, rising together through a fibrous ring. Surgeons call these perforators, and a flap will not lift until the perforators tethering it are dealt with.',
      'Suppose the knots are these staples, held stuck. The artery is the smooth muscle, answering breath in seconds by textbook physiology. The nerve is the star: when the vessel opens, the nerve reperfuses and its patch of skin lights up — a foot waking, miniaturised. The collar is the order: hyaluronan around the bundle gels when the tissue turns acidic and cool, and melts with warmth, washout and shear, so the sheet cannot slide until the staples open.',
      'The sheet is a separate, second system: the fascia and the interstitial space beneath it — galea, SMAS, platysma, the membranous layers of trunk and limbs, and the loose gliding plane under them. It is not what a knot is; it is what the knots hold down. Once enough staples open, the sheet delaminates, folds, vents and re-bonds over days — which is why the knots go first.',
    ],
    refs: ['jhong2026', 'jhong2026a', 'taylor1987', 'saintcyr2009', 'segal1986', 'stecco2011', 'heine1988', 'yoshinaga2025', 'bolton1936'],
    ready: true,
  },
  {
    id: 'latch',
    name: 'Vascular latch · vasocomputation',
    who: 'Johnson 2023',
    year: '2023',
    color: '#a595cf',
    short: 'Held predictions are held vascular tension; sustained contractions engage smooth muscle’s latch-bridge and “freeze” a pattern as a hyperprior.',
    layer: 'Vascular smooth muscle wherever it wraps a vessel — near neurons in the brain, and throughout the body’s arterioles (and hollow organs).',
    substance: 'Smooth muscle in the latch-bridge state: myosin cross-bridges that stay attached, holding tension at a fraction of the energy.',
    holds: 'The latch itself, plus a spiral: reduced flow reduces the energy available to unlatch.',
    releases: 'Somatic attention to the latched tissue, heat and cold cycling, meditation (noting generates prediction errors that tease latches open), psychedelics.',
    timescale: 'Latches form and dissolve over seconds to minutes; they can persist for hours to years.',
    breath: 'Indirect: through autonomic state and attention rather than a specific reflex.',
    travel: 'Patterns of tension are distributed; release follows the loosening of the predictions they hold.',
    age: 'We latch networks progressively from early childhood as we find predictive solutions; each latch makes the system simpler and less alive.',
    test: 'Map latches directly — imaging vascular tension patterns and their dissolution; the model predicts near-absent vasomotion during meditative cessations.',
    status: 'An integrative theory. Latch in pressurised skeletal-muscle arterioles looks like sustained activation rather than an economical hold; the brain-side claims are open.',
    body: [
      'Michael Edward Johnson’s Principles of Vasocomputation (2023) proposes three hypotheses about vascular smooth muscle: that vasomotion compresses fragile neural patterns into definite states; that a vascular contraction clamps the local circuit and so functions as medium-term memory — a specific prediction, in active-inference terms; and that a contraction held long enough engages the latch-bridge mechanism, durably freezing the circuit as a hyperprior, isolated from conscious experience and global updating.',
      'Tanha — craving, clinging — is then the reflexive compression of experience into stable, controllable states, and its residue is latched tension. “Tanha is cringe.” The original knots essay placed that latch in the arterioles inside skeletal muscle; the perforator essay relocates the vascular element to the skin and keeps the latch as an option for the brain, the venous bed and the gut.',
    ],
    refs: ['johnson2023', 'johnson2024notes', 'hai1988', 'jhong2026'],
    ready: false,
  },
  {
    id: 'trigger-point',
    name: 'Integrated trigger point',
    who: 'Simons · Travell',
    year: '1983–2004',
    color: '#e0ac4f',
    short: 'A knot is a contraction knot in a taut band of skeletal muscle at a dysfunctional motor endplate, starving itself into an energy crisis.',
    layer: 'Inside skeletal muscle, at the motor endplate zone of a taut band.',
    substance: 'Locally contracted sarcomeres (a “contraction knot”), excess acetylcholine release, and a sensitising chemical milieu.',
    holds: 'Energy crisis: sustained contracture compresses capillaries, ischaemia blocks the ATP needed to relax, and released substances sensitise nerves.',
    releases: 'Ischaemic compression, stretch, dry needling, injection; the local twitch response.',
    timescale: 'Seconds to minutes for inactivation; weeks for perpetuating factors.',
    breath: 'Indirect — relaxation lowers motor drive.',
    travel: 'Referred pain follows stereotyped patterns; key trigger points maintain satellites.',
    age: 'Accumulates with overload, posture and injury.',
    test: 'Imaging of taut bands (MR and ultrasound elastography), spontaneous electrical activity at the nidus, biochemistry by microdialysis.',
    status: 'Widely taught; key observations replicated (hypoechoic, stiff nodules; spontaneous EMG; acidic milieu), but diagnostic reliability and specificity remain contested.',
    body: [
      'Janet Travell and David Simons mapped hundreds of myofascial trigger points and their referred-pain patterns (The Trigger Point Manual, 1983). The integrated hypothesis, expanded by Gerwin, Dommerholt and Shah (2004), proposes that excessive acetylcholine at a motor endplate sustains sarcomere contracture, compressing local vessels; the resulting ischaemia and acidity release bradykinin, CGRP and substance P, sensitising nociceptors and perpetuating the loop.',
      'Its strongest support: ultrasound and elastography show discrete stiff hypoechoic nodules with abnormal flow (Sikdar 2009); microdialysis finds an acidic, mediator-rich milieu at active points (Shah 2005); needle EMG records spontaneous activity at the nidus, which mental stress turns up (Hubbard & Berkoff 1993; McNulty 1994).',
    ],
    refs: ['travell1983', 'gerwin2004', 'sikdar2009', 'shah2005', 'hubbard1993', 'mcnulty1994'],
    ready: false,
  },
  {
    id: 'densification',
    name: 'Fascial densification',
    who: 'Stecco',
    year: '2011',
    color: '#6fa7a2',
    short: 'Knots are densified loose connective tissue: hyaluronan between fascial layers turned viscous, so the layers stop gliding.',
    layer: 'The loose areolar layers between and within fasciae.',
    substance: 'Hyaluronan whose chains aggregate as the tissue turns acidic and cool — a gel instead of a lubricant.',
    holds: 'Viscosity; reduced glide loads nerve endings in the fascia.',
    releases: 'Deep friction (fascial manipulation), heat, movement; the change is reversible.',
    timescale: 'Minutes (with heat and friction) to weeks.',
    breath: 'Not central.',
    travel: 'Along sequences of fascia (myofascial units and chains).',
    age: 'Densification rises with immobility and age; the loose layers thicken.',
    test: 'Ultrasound: the loose sublayers are thicker in chronic neck pain and thin with treatment (Stecco 2014).',
    status: 'Plausible biophysics with supportive imaging; small trials.',
    body: [
      'Carla and Antonio Stecco’s group in Padua described hyaluronan-rich loose connective tissue between fascial layers and proposed its densification as a substrate of myofascial pain (2011). In the perforator hypothesis, the same densification is the collar around each staple.',
    ],
    refs: ['stecco2011', 'stecco2014', 'langevin2011'],
    ready: false,
  },
  {
    id: 'nerve',
    name: 'Peripheral nerve sensitivity',
    who: 'Quintner · Cohen',
    year: '1994',
    color: '#6f8fc2',
    short: 'Tender points are sites of nerve sensitivity — the nerve and its sheath — rather than a lesion in muscle.',
    layer: 'Cutaneous and muscular nerves, especially where they pierce fascia.',
    substance: 'Sensitised nerve trunks (nervi nervorum), secondary hyperalgesia.',
    holds: 'Peripheral and central sensitisation.',
    releases: 'Nerve gliding, desensitisation; hydrodissection at entrapment sites.',
    timescale: 'Variable.',
    breath: 'Indirect.',
    travel: 'Along the nerve’s territory.',
    age: 'Entrapments and sensitisation rise with age and injury.',
    test: 'Nerve-specific tests at tender points; response to hydrodissection.',
    status: 'Entrapment syndromes at perforation sites are established (ACNES, cluneal, occipital neuralgia); generalising to all knots is contested.',
    body: [
      'John Quintner and Milton Cohen (1994) argued that the “myofascial pain” construct misattributes to muscle what arises in peripheral nerves. With Geoffrey Bove (2015) they critiqued trigger-point theory’s circularity. The perforator hypothesis agrees on the nerve and adds the vessel and collar that travel with it.',
    ],
    refs: ['quintner1994', 'quintner2015', 'yoshinaga2025'],
    ready: false,
  },
  {
    id: 'central',
    name: 'Central sensitisation',
    who: 'Woolf et al.',
    year: '1983–',
    color: '#e6a8a0',
    short: 'The tenderness lives in the spinal cord and brain: amplified processing makes ordinary tissue feel like knots.',
    layer: 'Dorsal horn and brain; the body is where it is felt, not where it is made.',
    substance: 'Changed synaptic gain in nociceptive pathways.',
    holds: 'Central plasticity, sustained by attention, threat and sleep loss.',
    releases: 'Safety, sleep, graded movement, pain education — global, not local.',
    timescale: 'Days to months.',
    breath: 'Through arousal and threat.',
    travel: 'Spreads by segment and by attention.',
    age: 'Not tied to age so much as to history.',
    test: 'Widespread lowered pressure-pain thresholds, including at sites never worked.',
    status: 'Well established as a mechanism in many chronic pain states; does not explain discrete, reproducible sites.',
    body: [
      'Central sensitisation — an increase in the responsiveness of central nociceptive neurons — is documented across chronic pain conditions (Woolf 1983; 2011). On this view, knots are real experiences with a central amplifier.',
    ],
    refs: ['woolf2011'],
    ready: false,
  },
  {
    id: 'attention',
    name: 'The other road',
    who: 'the brief',
    year: '2026',
    color: '#b9c1cf',
    short: 'The practices and states generate most of the phenomena: hyperventilation makes the sparks, attention makes the map, anything that relocates instantly is a percept.',
    layer: 'In the nervous system’s model of the body.',
    substance: 'Perception, shaped by attention, breath chemistry, sleep and expectation.',
    holds: 'Attention and belief.',
    releases: 'Changing attention; normal breathing chemistry; rest.',
    timescale: 'Instantaneous.',
    breath: 'Hyperventilation lowers CO₂ and produces tingling and sparks everywhere.',
    travel: 'Percepts relocate in the blink of an eye.',
    age: 'Not predicted.',
    test: 'Perfusion changes at releases are global, equal at sham sites, and track CO₂ rather than the felt event.',
    status: 'The conventional account; real, strong, and the physician’s first road.',
    body: [
      'The essay states it plainly: hyperventilation produces exactly the sparks called stars; a muscle inhibited by pain feels detached; air drawn into the throat and expelled is a known behaviour; sleep loss distorts the body map. The two roads agree that tender points are real and change within a session. Where they part is testable with a Doppler map, a laser-speckle field and one ultrasound.',
    ],
    refs: ['jhong2026', 'lindahl2017'],
    ready: false,
  },
];

export const hypothesisById = (id: string) => HYPOTHESES.find((h) => h.id === id);
