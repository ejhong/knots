/**
 * The introduction: nine chapters, each a short text and a scene in the
 * atlas. `scene` is interpreted by src/viewer/ui/TourUI.ts.
 */
export interface TourScene {
  /** Camera as fractions of standing height: position and target. */
  pose: { p: [number, number, number]; t: [number, number, number]; fov?: number };
  age?: number;
  lift?: number;
  section?: 'sagittal' | 'coronal' | 'neck' | null;
  /**
   * Special behaviours: `breath` lets many small knots go on a slow exhale,
   * then presses knots one at a time; `release` only presses.
   */
  demo?: 'breath' | 'release' | 'ladder' | 'life';
  turntable?: boolean;
  trees?: number;
  /** Show the fascial layers and the perforators' stalks (opened by `lift`). */
  layers?: boolean;
  /** Show the deep channels on the deep fascia. */
  channels?: boolean;
  /** Open the dissection window on the upper back. */
  window?: boolean;
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

const VCE = 'https://sites.brown.edu/britton/research/the-varieties-of-contemplative-experience/';
const CHEETAH = 'https://www.cheetahhouse.org';

export const CHAPTERS: Chapter[] = [
  {
    id: 'observation',
    n: '01',
    glyph: '息',
    title: 'Observations',
    seconds: 30,
    html: `<p>Press into a knot, breathe out slowly, and it often lets go within seconds. That speed is the first clue. Tissue does not remodel in seconds — collagen, scar and adhesion change over days and weeks — so whatever lets go on an out-breath must be a <strong>state</strong>: something the body is doing, and can stop doing.</p>
<p>Reports from contemplative practice and bodywork include:</p>
<ul class="obs">
<li><b>Breath.</b> Knots seem to answer to the breath. They let go on a slow out-breath, and a single relaxing breath — the long exhale that comes on its own in a hot shower — can soften many small knots at once. Some knots seem to come and go with breath and mood, and some may even be held from moment to moment; deeper, persistent knots let go only to focused attention and breath.</li>
<li><b>Attention.</b> Pressure and focused attention — a foam roller, a patient hand — release knots one place at a time.</li>
<li><b>Stress.</b> Knots seem to worsen under stress, and gather where it is held: neck and shoulders, jaw, belly, low back.</li>
<li><b>Sparks.</b> A knot goes with a small pop, sometimes a star of tingling across a patch of skin.</li>
<li><b>Euphoria.</b> A release can bring a wave of well-being — at times a euphoria some compare to MDMA.</li>
<li><b>Migration.</b> When one knot lets go, others move in to fill the gap and settle into new places, as if the body were evening itself out.</li>
<li><b>Fascia.</b> Other reports involve the fascia beneath the skin, and unfold over hours or days: layers that seem to peel apart, places that feel hollow.</li>
<li><b>Filling.</b> Then a filling-in, felt as re-stitching, that can move like a snake along a limb, up the body, or up into the head.</li>
</ul>
<p>The contemplative traditions describe much of this in their own words.</p>`,
    refs: ['bolton1936', 'lindahl2017'],
    scene: { pose: { p: [0.34, 0.66, -1.5], t: [0.02, 0.62, -0.02] }, age: 46, demo: 'breath' },
  },
  {
    id: 'knot',
    n: '02',
    glyph: '結',
    title: 'What a knot might be',
    seconds: 26,
    html: `<p>Beneath the skin lies the superficial fascia, and beneath that a gliding plane over the deep fascia that wraps the muscles. The layers are joined in two ways: by fine fibrous strands, and wherever something passes through — a small artery with its veins, a cutaneous nerve and a lymphatic, rising together through a ring in the fascia. Surgeons call these <em>perforators</em>. They map them with a Doppler probe before raising a flap of skin, because the flap will not lift until the perforators holding it are dealt with.</p>
<p>Suppose a knot is a perforator held stuck. Then each part of the bundle explains something. <strong>The artery is smooth muscle:</strong> a deep in-breath constricts the small arteries of the skin within about two seconds, and a slow out-breath lets them open. <strong>The nerve is the spark:</strong> a constricted vessel starves its own nerve; when the vessel opens, the nerve wakes and its patch of skin lights up — a foot waking, in miniature. <strong>The collar is the hold:</strong> hyaluronan around the bundle thickens to a gel when the tissue is starved, acidic and cool, and thins again with warmth, flow and movement.</p>
<p>Here the layers are drawn apart: major perforators rising through the deep fascia, smaller ones through the superficial fascia, and a knot glowing wherever one is held.</p>`,
    refs: ['taylor1987', 'bolton1936', 'stecco2011'],
    scene: { pose: { p: [0.4, 0.84, -0.78], t: [0.03, 0.78, -0.04] }, age: 46, layers: true, lift: 1, window: true },
  },
  {
    id: 'trees',
    n: '03',
    glyph: '根',
    title: 'Trees, and knots that move',
    seconds: 24,
    html: `<p>A perforator stays in place, but each belongs to a tree of vessels, and each tree has a root: a source artery feeding a whole territory of skin. Small arteries <em>conduct</em>. A dilation that starts at one branch travels along the vessel wall toward the vessel that feeds it, at millimetres to centimetres a second.</p>
<p>This may be why knots seem to move. When one branch opens, flow and pressure shift across its tree, and the neighbouring vessels adjust — some relaxing, some tightening — until the territory settles into a new balance. Felt from the inside, that would be knots moving into the gap and finding new places: the evening-out people describe. Here each release sends light along its tree.</p>`,
    refs: ['segal1986', 'saintcyr2009'],
    scene: { pose: { p: [-0.5, 0.76, -1.1], t: [0.0, 0.68, -0.03] }, age: 50, demo: 'release', trees: 1.6 },
  },
  {
    id: 'fascia',
    n: '04',
    glyph: '膜',
    title: 'The fascia',
    seconds: 24,
    html: `<p>The superficial fascia runs unbroken from scalp to sole — the galea over the skull, the SMAS of the face, the platysma of the neck, the membranous layers of the trunk and limbs — and glides over the deep fascia on a plane of loose, hyaluronan-rich tissue. It is not free everywhere: it is anchored to bone along particular lines, and tethered by fibrous strands and by the perforators that pass through it. Deeper down, the fascia is built more like channels — walls between the muscles, and sleeves around the vessels and nerves, drawn here in gold.</p>
<p>The slower reports seem to belong to this layer: fascia that peels and separates, places that feel hollow, and then a gradual filling-in, felt strand by strand as re-stitching. Separated layers are known to rejoin in just that way — fibrin bridging the gap within days, collagen within weeks.</p>`,
    refs: ['gray2020', 'benias2018', 'guimberteau2015', 'langevin2011'],
    scene: { pose: { p: [1.07, 0.66, -1.05], t: [0.05, 0.61, -0.02] }, age: 46, layers: true, lift: 1, channels: true },
  },
  {
    id: 'ladder',
    n: '05',
    glyph: '数',
    title: 'A ladder of a hundred thousand',
    seconds: 24,
    html: `<p>Those who count describe a hierarchy: a few large knots that take many sessions to clear, and micro-knots at dozens to the square inch — hundreds of thousands in a body, by their own estimate. That is what a branching tree of vessels looks like from the skin.</p>
<p>In 1987 Taylor and Palmer mapped the body’s arterial territories: about forty source arteries, and on average <strong>374</strong> major perforators, each at least half a millimetre across. Below them come smaller perforators, and below those the small vessels rising to the skin — one every four or five millimetres over about 1.8 m² of skin, on the order of <strong>100,000</strong>. The figure is drawn from that ladder.</p>`,
    refs: ['taylor1987', 'saintcyr2009'],
    scene: { pose: { p: [0, 0.6, 2.35], t: [0, 0.54, 0] }, age: 46, demo: 'ladder' },
  },
  {
    id: 'life',
    n: '06',
    glyph: '齢',
    title: 'Across a life',
    seconds: 30,
    html: `<p>Knots accumulate with age; the young have few. As we age, the small vessels of the skin respond less readily and resting sympathetic tone rises. The two curves — knots, and the reactivity of the skin’s vessels — have never been laid over each other. If knots are held perforators, the curves should match place by place, and children should be nearly free of knots.</p>
<p>Here a life plays from one to ninety. The count in the corner is a prediction, not a measurement: no one has yet taken a census of knots.</p>`,
    scene: { pose: { p: [-0.62, 0.66, 1.9], t: [0, 0.52, 0] }, demo: 'life' },
  },
  {
    id: 'traditions',
    n: '07',
    glyph: '経',
    title: 'What the traditions knew',
    seconds: 24,
    html: `<p>Nearly every tradition that mapped the inner body arrived at three claims: <em>there are knots, breath is the tool, and untying them changes the mind.</em> Tibetan practice works the winds with the breath to loosen knots in the channels. Yoga names three knots, the granthis, along the central channel, and describes kuṇḍalinī rising like a serpent, with heat, currents and involuntary movement. The Buddha likened the rapture of deep concentration to water kneaded into a ball of bath powder until the whole of it is soaked through.</p>
<p>Chinese medicine mapped both layers. There are the tender <em>ashi</em> points and the acupoints — about eighty percent of which lie where a vessel–nerve bundle pierces the superficial fascia (Heine, 1988) — and there are the sinew channels, each of which <em>knots</em> (結) at the bony prominences where the fascia is anchored. Correspondence found after the fact is weak evidence, but it is now specific enough to check.</p>`,
    refs: ['heine1988', 'lingshu', 'hyp', 'mullin1996', 'dn2'],
    scene: { pose: { p: [1.2, 0.72, 1.6], t: [0, 0.55, 0] }, age: 46, turntable: true },
  },
  {
    id: 'theories',
    n: '08',
    glyph: '説',
    title: 'Alternate theories',
    seconds: 22,
    html: `<p>Perforators are one answer. Michael Johnson’s <em>vasocomputation</em> places held tension in latched vascular smooth muscle — predictions held as vascular clamps. It may describe a system of its own, closer to the clinging of the mind than to the knots a roller finds; or the two may prove to be views of the same knots.</p>
<p>The trigger-point hypothesis finds contraction knots at overactive motor endplates inside muscle. Fascial densification places knots in thickened hyaluronan between the layers. A nerve view finds sensitised nerves where they pierce the fascia. And the physician’s first answer places knots in perception: the spinal cord and brain turn ordinary signals into tender spots, overbreathing makes the sparks, and attention makes the map. Each predicts something different, and each can be drawn on the same body — see <a href="HYP">Hypotheses</a>, or choose one in the <a href="ATLAS">Atlas</a>.</p>`,
    refs: ['johnson2023', 'gerwin2004', 'stecco2011', 'quintner1994', 'woolf2011'],
    scene: { pose: { p: [-1.4, 0.7, -1.2], t: [0, 0.55, 0] }, age: 46, turntable: true },
  },
  {
    id: 'moderation',
    n: '09',
    glyph: '中',
    title: 'Moderation',
    seconds: 22,
    html: `<p>Go gently. Deep somatic work and intensive meditation carry real dangers, and people have been harmed by doing too much, too fast: forceful breathing and breath-holding, hard pressure held too long, long retreats with little sleep. Difficulties can last months or years — anxiety and panic, insomnia, pain, involuntary movements, a disturbed sense of self, energy that will not settle. Never press hard into the neck, where the arteries to the brain lie close beneath the surface.</p>
<p>Nothing here is a protocol. Work in moderation, rest often, and stop when something feels wrong. If you are struggling, you are not alone: the <a href="${VCE}">Varieties of Contemplative Experience</a> project at Brown documents these difficulties, and <a href="${CHEETAH}">Cheetah House</a> supports meditators in distress. For anything physical, see a physician.</p>`,
    refs: ['lindahl2017', 'britton', 'cheetah'],
    scene: { pose: { p: [0, 0.62, 2.6], t: [0, 0.56, 0] }, age: 46, turntable: true },
  },
];
