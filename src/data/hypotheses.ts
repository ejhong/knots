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
  /** One or two words, for the atlas menu. */
  label: string;
  /** Proponents, short form for the atlas list. */
  who: string;
  year: string;
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
    label: 'Perforators',
    who: 'proposed here',
    year: '2026',
    short: 'A knot is a perforator held stuck — the small artery, veins, nerve and lymphatic that pass together through a ring in the fascia: vessel constricted, collar gelled, nerve pressed.',
    layer: 'Where a vessel–nerve bundle pierces a fascia: the deep fascia for major perforators, the superficial fascia for smaller ones.',
    substance: 'Three things in one bundle: a constricted arteriole, a gelled collar of hyaluronan, and a compressed cutaneous nerve.',
    holds: 'A loop: constriction starves the tissue; the starved, acidic collar gels and tethers; the pressed nerve drives more constriction. Three memories on three timescales.',
    releases: 'Pressure finds the place and a slow out-breath lets it go: the vessel opens in seconds, the collar thins over minutes with warmth and movement, and the waking nerve flashes as a spark.',
    timescale: 'Seconds (vessel) · minutes (collar) · days to weeks (the fascia rejoining).',
    breath: 'A deep in-breath reflexly constricts the skin’s small arteries within about two seconds; a slow out-breath lets them open. The breath acts directly on the vessel that is the knot.',
    travel: 'Small arteries conduct: a dilation travels along the vessel wall toward its feeding vessel at millimetres to centimetres a second, and flow shifts across the tree as a branch opens — so knots seem to move, and even out.',
    age: 'With age resting sympathetic tone rises and the skin’s small vessels respond less, all over the body; knots should rise with them in number and in size — first where stress is held — and children should be nearly free of them.',
    test: 'Blinded palpation against a blinded Doppler map: do tender points sit on perforators? Then laser-speckle imaging at a release: a local flush of blood flow on the out-breath, absent at a sham site and during a held in-breath.',
    status: 'Every link is ordinary physiology observed somewhere; the new claims — that a knot is a perforator, and that its state travels along the tree — are untested.',
    body: [
      'The superficial fascia is joined to the layer beneath in two ways: by fine fibrous strands, and at the places where something passes through — a small artery with its veins, a cutaneous nerve and a lymphatic, rising together through a fibrous ring. Surgeons call these perforators, and a flap of skin will not lift until the perforators tethering it are dealt with.',
      'Suppose a knot is a perforator held stuck. The artery is smooth muscle, answering the breath within seconds by textbook physiology. The nerve is the spark: when the vessel opens, the starved nerve wakes and its patch of skin lights up — a foot waking, in miniature. The collar is the hold: hyaluronan around the bundle thickens to a gel when the tissue turns acidic and cool, and thins with warmth, flow and movement.',
      'The fascia is a second system: the superficial fascia and the gliding plane beneath it, from the galea and the SMAS of the face to the membranous layers of the trunk and limbs. It is not what a knot is; it is what the knots hold down. The slower reports — fascia that peels and hollows, then fills in over days — may belong to it.',
    ],
    refs: ['taylor1987', 'saintcyr2009', 'segal1986', 'stecco2011', 'heine1988', 'yoshinaga2025', 'bolton1936'],
    ready: true,
  },
  {
    id: 'latch',
    name: 'Vascular latch · vasocomputation',
    label: 'Vascular latch',
    who: 'Johnson',
    year: '2023',
    short: 'Held predictions are held vascular tension: a contraction sustained long enough engages smooth muscle’s latch state and freezes a pattern in place.',
    layer: 'Vascular smooth muscle wherever it wraps a vessel — beside neurons in the brain, in the small arteries of skin and muscle throughout the body — and the walls of hollow organs.',
    substance: 'Smooth muscle in the latch-bridge state: cross-bridges that stay attached, holding tension at a fraction of the usual energy.',
    holds: 'The latch itself, and a spiral: reduced flow leaves less energy to unlatch.',
    releases: 'Attention to the held tissue, cycles of heat and cold, meditation — noticing creates prediction errors that tease latches open — and psychedelics.',
    timescale: 'Latches form and dissolve over seconds to minutes, and can persist for hours or years.',
    breath: 'Indirect: through autonomic state and attention rather than a specific reflex.',
    travel: 'Tension patterns are distributed; release follows the loosening of the predictions they hold.',
    age: 'Latches accumulate from early childhood as we settle on predictions; each makes the system simpler and less alive.',
    test: 'Image vascular tension directly as it forms and dissolves; the model predicts that vasomotion nearly stops during deep meditative cessations.',
    status: 'An integrative theory. In pressurised skeletal-muscle arterioles the latch looks more like sustained activation than an economical hold; the claims about the brain are open.',
    body: [
      'Michael Edward Johnson’s Principles of Vasocomputation (2023) makes three proposals about vascular smooth muscle: that vasomotion compresses fragile neural patterns into definite states; that a vascular contraction clamps the local circuit and so acts as a medium-term memory — a specific prediction, in the language of active inference; and that a contraction held long enough engages the latch-bridge mechanism, freezing the circuit as a durable hyperprior, cut off from awareness and from updating.',
      'Craving and clinging — taṇhā — then become the reflexive compression of experience into stable, controllable states, and latched tension is their residue. The latch may be a system of its own, closer to the clinging of the mind than to the knots a roller finds; or the two may prove to be views of the same knots. Johnson places latches wherever smooth muscle wraps a tube — vessels and hollow organs — so the atlas draws them in all of those places without drawing the organs: the small arteries of the skin and muscle, the great arteries of the trunk and limbs, the heart’s own vessels, and the walls of the airways, gut and bladder. The brain, at the centre of his account, is beyond this atlas.',
    ],
    refs: ['johnson2023', 'johnson2024notes', 'hai1988'],
    ready: true,
  },
  {
    id: 'trigger-point',
    name: 'Integrated trigger point',
    label: 'Trigger points',
    who: 'Travell · Simons',
    year: '1983–2004',
    short: 'A knot is a contraction knot in a taut band of muscle, at an overactive motor endplate that starves itself into an energy crisis.',
    layer: 'Inside skeletal muscle, at the motor endplate zone of a taut band.',
    substance: 'A patch of contracted sarcomeres — the contraction knot — with excess acetylcholine release and a sensitising chemical milieu.',
    holds: 'An energy crisis: sustained contraction squeezes the capillaries, and the ischaemia withholds the energy needed to relax; released substances sensitise nearby nerves.',
    releases: 'Sustained compression, stretch, dry needling or injection — often with a local twitch as it goes.',
    timescale: 'Seconds to minutes to inactivate; weeks for the factors that sustain it.',
    breath: 'Indirect: relaxation lowers motor drive.',
    travel: 'Pain refers in stereotyped patterns, and key trigger points maintain satellites.',
    age: 'Accumulates with overload, posture and injury.',
    test: 'Image taut bands (MR and ultrasound elastography), record spontaneous electrical activity at the nidus, and sample its chemistry by microdialysis.',
    status: 'Widely taught, and key findings replicate — stiff nodules on ultrasound, spontaneous electrical activity, an acidic milieu — but diagnosis by touch is unreliable and the construct remains contested.',
    body: [
      'Janet Travell and David Simons mapped hundreds of myofascial trigger points and their referred-pain patterns (The Trigger Point Manual, 1983). The integrated hypothesis, developed by Gerwin, Dommerholt and Shah (2004), proposes that excess acetylcholine at a motor endplate sustains a local contracture that compresses the nearby vessels; the resulting ischaemia and acidity release bradykinin, CGRP and substance P, which sensitise nerve endings and keep the loop going.',
      'Its strongest support: ultrasound and elastography show discrete, stiff, hypoechoic nodules with abnormal blood flow (Sikdar 2009); microdialysis finds an acidic, mediator-rich milieu at active points (Shah 2005); and needle recordings show spontaneous activity at the nidus that mental stress turns up (Hubbard & Berkoff 1993; McNulty 1994).',
    ],
    refs: ['travell1983', 'gerwin2004', 'sikdar2009', 'shah2005', 'hubbard1993', 'mcnulty1994'],
    ready: false,
  },
  {
    id: 'densification',
    name: 'Fascial densification',
    label: 'Densification',
    who: 'Stecco',
    year: '2011',
    short: 'Knots are densified loose connective tissue: hyaluronan between the fascial layers turned viscous, so the layers stop gliding.',
    layer: 'The loose layers between and within the fasciae.',
    substance: 'Hyaluronan whose chains clump as the tissue turns acidic and cool — a gel instead of a lubricant.',
    holds: 'Viscosity: the layers stop gliding, and the strain falls on nerve endings in the fascia.',
    releases: 'Deep friction (fascial manipulation), heat and movement; the change is reversible.',
    timescale: 'Minutes, with heat and friction, to weeks.',
    breath: 'Not central.',
    travel: 'Along sequences of fascia — myofascial units and chains.',
    age: 'Rises with immobility and age, as the loose layers thicken.',
    test: 'Ultrasound: the loose sublayers are thicker in chronic neck pain and thin with treatment (Stecco 2014).',
    status: 'Plausible biophysics with supportive imaging; small trials.',
    body: [
      'The Steccos’ group in Padua described the hyaluronan-rich loose tissue between fascial layers and proposed its densification as a source of myofascial pain (2011). On the perforator view the same densification is the collar around each perforator: the two agree about the gel, and differ about where it matters.',
    ],
    refs: ['stecco2011', 'stecco2014', 'langevin2011'],
    ready: false,
  },
  {
    id: 'nerve',
    name: 'Peripheral nerve sensitivity',
    label: 'Nerves',
    who: 'Quintner · Cohen',
    year: '1994',
    short: 'Tender points are sites of nerve sensitivity — the nerve and its sheath — rather than a lesion in muscle.',
    layer: 'Nerves of the skin and muscle, especially where they pierce the fascia.',
    substance: 'Sensitised nerve trunks, through the small nerves of their own sheaths (nervi nervorum).',
    holds: 'Sensitisation of the nerve, peripheral and central.',
    releases: 'Nerve gliding and desensitisation; freeing an entrapped nerve with fluid.',
    timescale: 'Variable.',
    breath: 'Indirect.',
    travel: 'Along the nerve’s territory.',
    age: 'Entrapment and sensitisation rise with age and injury.',
    test: 'Nerve-specific tests at tender points; the response to freeing the nerve with fluid (hydrodissection).',
    status: 'Entrapments where nerves pierce the fascia are established (anterior cutaneous and cluneal nerve entrapment); extending this to all knots is contested.',
    body: [
      'John Quintner and Milton Cohen (1994) argued that the idea of myofascial pain misattributes to muscle what arises in peripheral nerves, and with Geoffrey Bove (2015) they criticised the circularity of trigger-point theory. The perforator view agrees about the nerve, and adds the vessel and the collar that travel with it.',
    ],
    refs: ['quintner1994', 'quintner2015', 'yoshinaga2025'],
    ready: false,
  },
  {
    id: 'central',
    name: 'Perception — sensitisation and attention',
    label: 'Perception',
    who: 'clinical medicine',
    year: '',
    short: 'No special structure in the tissue: the spinal cord and brain turn ordinary signals into tender spots, overbreathing makes the sparks, and attention makes the map.',
    layer: 'The spinal cord and brain: a knot is felt in the body but made in the nervous system.',
    substance: 'Raised gain in the pain pathways, and perception shaped by attention, expectation, sleep and the chemistry of the breath.',
    holds: 'Central plasticity, kept up by threat, attention and poor sleep.',
    releases: 'Safety, sleep, movement, a change of attention, ordinary breathing — global rather than local.',
    timescale: 'Instantaneous for percepts; days to months for sensitisation.',
    breath: 'Overbreathing lowers carbon dioxide and causes tingling and sparks anywhere; slow breathing calms arousal and threat.',
    travel: 'A percept can move anywhere in an instant; sensitisation spreads by spinal segment.',
    age: 'Tied less to age than to history: injury, stress and sleep.',
    test: 'Widespread lowered pressure-pain thresholds, including at places never worked; and at a felt release, blood-flow changes that are global, equal at sham sites, and follow carbon dioxide rather than the felt event.',
    status: 'Central sensitisation is well established in many chronic pain states, and overbreathing reliably causes tingling. Neither explains why the same discrete spots return to the same places.',
    body: [
      'Central sensitisation — a rise in the responsiveness of the pain pathways in the spinal cord and brain — is documented across chronic pain conditions (Woolf 1983; 2011). Ordinary pressure on ordinary tissue comes to hurt, and tender spots appear without a lesion beneath them.',
      'The same view answers the stranger reports. Overbreathing produces exactly the tingling sparks people describe; attention amplifies whatever it rests on; a muscle inhibited by pain feels detached; sleep loss distorts the body map. None of this makes the sensations imaginary: they are real, made by ordinary physiology rather than by a hidden structure. It is the physician’s first answer, and the account every other view has to beat.',
    ],
    refs: ['woolf2011', 'lindahl2017'],
    ready: false,
  },
];

export const hypothesisById = (id: string) => HYPOTHESES.find((h) => h.id === id);
