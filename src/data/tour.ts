/**
 * The introduction: twelve chapters, each a short text and a scene in the
 * atlas. The text is drawn from Knots of Existence Hypotheses (2026); the
 * scenes illustrate it. `scene` is interpreted by src/viewer/ui/TourUI.ts.
 */
export interface TourScene {
  /** Camera as fractions of standing height: position and target. */
  pose: { p: [number, number, number]; t: [number, number, number]; fov?: number };
  age?: number;
  lift?: number;
  section?: 'sagittal' | 'coronal' | 'neck' | null;
  /** Special behaviours. */
  demo?: 'release' | 'pulse-occiput' | 'ladder' | 'life' | 'aggravate' | 'orbit' | 'gate';
  turntable?: boolean;
  trees?: number;
}

export interface Chapter {
  id: string;
  n: string;
  glyph: string;
  title: string;
  html: string;
  refs?: string[];
  seconds: number;
  scene: TourScene;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'observation',
    n: '01',
    glyph: '息',
    title: 'The observation',
    seconds: 22,
    html: `<p><em>Pressure locates a knot, and a slow exhale releases it, in seconds.</em> That observation is available to anyone with a foam roller — and it is the first clue. Tissue does not remodel in five seconds; collagen, scar and adhesion change over days to weeks. Whatever lets go mid-exhale must be a <strong>state</strong>: something the body is actively doing, and can stop doing quickly.</p>
<p>Knots accumulate with age. They gather at the junctions — the base of the skull, the neck, the shoulder blades, the low back, the hips — and in the brace muscles of jaw, throat and belly. Those who take release work furthest report more: knots go with a small pop, felt as a spark or a <em>star</em>; they release along paths that converge on the back of the skull, where released knots are replaced by others, <em>as if from a queue</em>.</p>`,
    refs: ['jhong2026a', 'jhong2026'],
    scene: { pose: { p: [0.32, 0.88, -0.62], t: [0.02, 0.8, -0.02] }, age: 46, demo: 'release' },
  },
  {
    id: 'two-families',
    n: '02',
    glyph: '二',
    title: 'Two families',
    seconds: 20,
    html: `<p>Go further — more hours, more breath, more attention, over months — and a second set of reports appears. Layers separate strand by strand, with a crackle. A layer at the back of the head peels and spreads forward over the face. Regions feel hollowed. Something air-like moves through connected pockets and vents at the back of the mouth. Long chains slide back into place over days; the hollows fill, as if stitched.</p>
<p>Read as one story the reports are baffling; read as two, they organise themselves. The <strong>knots</strong> answer pressure and breath in seconds. The <strong>sheet</strong> unfolds over hours and days and does not answer rolling at all. And the order is strict: the knots go first. Two timescales, two triggers, a strict order — two systems, meeting at one anatomical fact.</p>`,
    scene: { pose: { p: [-0.72, 0.78, -1.5], t: [0, 0.58, 0] }, age: 46, lift: 0.45, turntable: true },
  },
  {
    id: 'staple',
    n: '03',
    glyph: '結',
    title: 'The staple',
    seconds: 26,
    html: `<p>The superficial fascia — under the skin, above the muscle — is fixed to the layer beneath in two ways: passive fibrous septa, and the places where something passes through. A small artery with its veins, a cutaneous nerve and a lymphatic rise together through a fibrous ring. Surgeons call these <em>perforators</em> and find them with a pencil Doppler before raising a flap, because a flap will not lift until they are dealt with.</p>
<p>Suppose the knots are these staples, held stuck. <strong>The artery is the smooth muscle:</strong> a deep inhale reflexly constricts skin arterioles within about two seconds; a slow exhale lets them open. <strong>The nerve is the star:</strong> when the vessel opens, the starved nerve reperfuses and its patch of skin lights up — a foot waking, in miniature. <strong>The collar is the order:</strong> hyaluronan around the bundle gels when the tissue turns acidic and cool, and melts with warmth, washout and shear; only then can the sheet slide.</p>
<p>Here the sheet is lifted to show them: stalks crossing the interstitial plane, a collar where each pierces the sheet, the stuck ones burning.</p>`,
    refs: ['taylor1987', 'bolton1936', 'stecco2011'],
    scene: { pose: { p: [0.36, 0.86, -0.26], t: [0.02, 0.82, -0.05] }, age: 46, lift: 0.95 },
  },
  {
    id: 'trees',
    n: '04',
    glyph: '根',
    title: 'Trees and roots',
    seconds: 24,
    html: `<p>Perforators do not move. But every perforator belongs to a tree, and every tree has a root. Arterioles <em>conduct</em>: a dilation that starts at a branch travels along the vessel wall toward its feeding vessel at millimetres to centimetres a second. And a downstream vessel cannot stay open while the trunk that feeds it is shut — which is why cleared areas come back until something upstream clears too.</p>
<p>So the felt release climbs the tree and queues at the trunk’s entry. On the back of the head that entry is a real gate: the occipital artery emerges through the deep fascia between trapezius and sternocleidomastoid at the superior nuchal line, with the greater occipital nerve beside it. Every perforator of the posterior scalp is downstream of it. Watch the light climb toward the rings.</p>`,
    refs: ['segal1986', 'hong1998'],
    scene: { pose: { p: [0.14, 0.93, -0.36], t: [0, 0.9, -0.02] }, age: 46, demo: 'pulse-occiput', trees: 1.6 },
  },
  {
    id: 'sheet',
    n: '05',
    glyph: '膜',
    title: 'The sheet',
    seconds: 24,
    html: `<p>The scalp and face are covered by one continuous sheet — the galea aponeurotica, becoming the temporoparietal fascia, becoming the SMAS of the face — over a plane of loose tissue anatomists call the danger area of the scalp, because anything introduced into it spreads over the whole cranium. Below the neck the same arrangement continues over the entire body, pinned to bone along particular lines: nuchal line, mastoid, cheekbone, jaw, collarbone, iliac crest, inguinal ligament.</p>
<p>On this reading the second family is the sheet behaving once its staples are free. Separation is septa giving way. The chains are folds propagating along a loosened membrane — nothing is pulled; a fold advances. The gates are attachment lines where folds pile up. Hollowing is a freed pocket; filling is re-adhesion, fibrin bridging within days and collagen within two weeks — strand by strand, which is why it is felt as stitching.</p>`,
    refs: ['gray2020', 'benias2018', 'guimberteau2015'],
    scene: { pose: { p: [0.62, 0.52, 0.05], t: [0, 0.47, -0.01] }, age: 46, lift: 0.7, section: 'sagittal' },
  },
  {
    id: 'ladder',
    n: '06',
    glyph: '数',
    title: 'A ladder of a hundred thousand',
    seconds: 24,
    html: `<p>Practitioners who count report a hierarchy: a handful of roots at the ridges, big knots that take sessions to clear, and micro-knots at dozens per square inch — hundreds of thousands in a body, by their own estimate. That is what a branching tree looks like from the skin.</p>
<p>Taylor and Palmer mapped the body’s arterial territories in 1987: about forty source arteries, and an average of <strong>374</strong> major perforators (≥ 0.5 mm) per subject. Below them come medium perforators, and below those the small perforators and ascending vessels of the subdermal plexus, millimetres apart: at one every four or five millimetres across ~1.8 m² of skin, on the order of <strong>100,000</strong>. The figure here is drawn from exactly that ladder.</p>`,
    refs: ['taylor1987', 'saintcyr2009'],
    scene: { pose: { p: [0, 0.6, 2.35], t: [0, 0.54, 0] }, age: 46, demo: 'ladder' },
  },
  {
    id: 'life',
    n: '07',
    glyph: '齢',
    title: 'Across a life',
    seconds: 30,
    html: `<p>Knots accumulate with age; the young have few. Cutaneous microvascular function declines with age and resting sympathetic tone rises. The two curves — knot burden and the skin’s vascular reactivity — have never been laid on top of each other, and on this hypothesis they should match, site by site. Children, whose perforators are open, should be nearly clean.</p>
<p>Here a life plays from one to ninety. The census in the corner counts what the model holds at each age: a prediction, not a measurement — the census nobody has taken.</p>`,
    scene: { pose: { p: [-0.62, 0.66, 1.9], t: [0, 0.52, 0] }, demo: 'life' },
  },
  {
    id: 'base',
    n: '08',
    glyph: '枕',
    title: 'The knot at the base of the brain',
    seconds: 24,
    html: `<p>Accounts of awakening, across traditions, often place the decisive moment low at the back of the head, where the brain meets the neck, felt inside rather than on it. The anatomy there is a ring. Behind, the nuchal ligament anchors the posterior sheet and the two occipital trees meet. Beneath, the suboccipital muscles — the densest muscle spindles in the body — are tied to the dura around the brainstem by the <em>myodural bridge</em>, described in 1995. In front, the throat’s constrictors hang from the base of the skull.</p>
<p>A release here would change everything at once. The traditions put it here too: <em>Fengfu</em>, the Wind Palace, at the midline seam; <em>Naohu</em>, the Brain’s Door, on the bump; and for the Daoist alchemists, the <em>Jade Pillow</em> — the third and hardest gate.</p>`,
    refs: ['hack1995'],
    scene: { pose: { p: [0.08, 0.92, -0.3], t: [0, 0.905, -0.03] }, age: 46, demo: 'gate' },
  },
  {
    id: 'traditions',
    n: '09',
    glyph: '経',
    title: 'What the traditions knew',
    seconds: 24,
    html: `<p>Nearly every tradition that mapped the inner body arrived at three claims: <em>there are knots, breath is the tool, and untying them changes consciousness.</em> Tibetan tsa lung unties channel-knots by working the winds with breath; yoga names three granthis along the central channel; the kuṇḍalinī literature describes energy travelling and involuntary movement.</p>
<p>Chinese medicine described <em>both</em> systems. Tender <em>ashi</em> points and acupoints — about eighty percent of which sit where a neurovascular bundle perforates the superficial fascia (Heine 1988) — and the sinew channels, each of which <em>knots</em> (結) at bony prominences: the attachment lines of the sheet. The points at the base of the skull are named for wind. Correspondence found after the fact is weak evidence — but specific enough now to be coded blind.</p>`,
    refs: ['heine1988', 'langevin2002', 'dorsher2009', 'lingshu'],
    scene: { pose: { p: [1.2, 0.72, 1.6], t: [0, 0.55, 0] }, age: 46, turntable: true },
  },
  {
    id: 'rivals',
    n: '10',
    glyph: '説',
    title: 'Rival answers',
    seconds: 20,
    html: `<p>The staple is one answer. Michael Johnson’s <em>vasocomputation</em> places held tension in latched vascular smooth muscle — predictions held as vascular clamps. The integrated trigger-point hypothesis finds contraction knots at dysfunctional motor endplates. Stecco’s densification locates it in hyaluronan between fascial layers; Quintner and Cohen in sensitised nerves; central sensitisation in the spinal cord and brain. And the physician’s first road: hyperventilation makes the sparks, attention makes the map.</p>
<p>They are not all rivals. The perforator essay reads Johnson’s latch as the live form of the same clinging whose stored form is a stuck staple, and agrees with the nerve and densification views about two of the three parts of its bundle. Where they part is testable. See <a href="HYP">Hypotheses</a>.</p>`,
    refs: ['johnson2023', 'gerwin2004', 'stecco2011', 'quintner1994', 'woolf2011'],
    scene: { pose: { p: [-1.4, 0.7, -1.2], t: [0, 0.55, 0] }, age: 46, turntable: true },
  },
  {
    id: 'tests',
    n: '11',
    glyph: '験',
    title: 'What would show it',
    seconds: 24,
    html: `<p>None of it is expensive. <strong>Map the staples:</strong> one blinded examiner marks tender points, another maps perforators with a pencil Doppler, a third computes coincidence against chance. <strong>Film a star:</strong> laser speckle over a knot and a sham site — a local perfusion flash on the exhale, time-locked to the felt release, and absent during an inhale-hold. <strong>Free a collar without breath:</strong> hydrodissect a perforator under ultrasound; if the knot is a collared perforator it lets go with the fluid.</p>
<p><strong>Time the chains</strong> against conducted vasodilation. <strong>Lay the curves together</strong>, site by site, across the life span. <strong>Image the seam</strong> at the base of the skull before and after a release. The measurement has moved to the surface — to where a small artery and a nerve come up through the fascia together.</p>`,
    refs: ['yoshinaga2025', 'sikdar2009'],
    scene: { pose: { p: [0.3, 0.9, -0.42], t: [0.03, 0.86, -0.04] }, age: 46, demo: 'release' },
  },
  {
    id: 'caution',
    n: '12',
    glyph: '慎',
    title: 'A caution',
    seconds: 22,
    html: `<p>Everything that admits air into the body, separates a plane or stretches a nerve is an injury, and the practices that would do it are documented hazards. The suboccipital triangle sits over the vertebral artery; deep pressure there is a known stroke risk. Forceful blowing, breath-holds and straining can drive air into the face and chest. The traditions preserved a warning about untying too fast; the modern literature on intensive practice records destabilisation lasting months to years. Nothing here is a protocol. The benefits are slow; the dangers concentrate in speed.</p>
<p><em>Someone should put a Doppler pen there and press.</em> — the essay’s last line. Enter the <a href="ATLAS">atlas</a> to explore.</p>`,
    refs: ['lindahl2017', 'cheetah'],
    scene: { pose: { p: [0, 0.62, 2.6], t: [0, 0.56, 0] }, age: 46, turntable: true },
  },
];
