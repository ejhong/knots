# Roadmap

A living list. Checked items are live.

## Look and content
- [x] Look and feel of The OM Project (rice paper, ink stone, small system type, earth palette)
- [x] Introduction: nine chapters, each a scene; scrolling the panel moves the figure
- [ ] Author's content revisions (in progress)

## Atlas — the perforator hypothesis
- [x] Figure from MakeHuman (CC0): age 1–90, female↔male, runtime subdivision
- [x] Perforator ladder: roots → 374 major → ~3,600 medium → ~100,000 small; trees along the skin
- [x] Knot simulation: vessel tone / collar gel / nerve; breath-gated release; conducted dilation up the tree; age settle
- [x] Tools: press (exhale-gated), roll, hydrodissect, stress brush; scenarios (back ache, desk neck, headache, anxious, cold, sauna)
- [x] Stars and light climbing the trees on release
- [ ] The fascia over days (later): peeling, hollowing and re-knitting, drawn from reports
- [ ] Attachment lines of the fascia (zygoma, mandible, hyoid, clavicle, axilla, inguinal ligament, iliac crest, …)
- [ ] Named fasciae (galea, SMAS, platysma, thoracolumbar fascia, fascia lata)
- [ ] The tissue block: one perforator up close — artery, venae comitantes, nerve, lymphatic, collar, septa
- [ ] Posture with age (kyphosis, forward head) with part-aware deformation
- [ ] Move ladder generation into a Web Worker; mobile quality tiers
- [ ] Exclude cavities (inside the mouth, eye sockets, nostrils, ear canals) from perforator sampling — ray-test each vertex outward
- [ ] Tame additive glare where stalks are seen edge-on at silhouettes and section edges
- [x] Fascial layers, stalks and collars; region-specific depths; section cuts
- [x] Layered anatomy by default (exploded): skin · superficial fat · superficial fascia · gliding plane · deep fascia · muscle
- [x] Perforators at true depths (major through deep fascia, small through superficial fascia); knots at the collar
- [x] Dissection window (off by default; double-click to open one)
- [x] Knots drawn the same in every theory (terracotta); perforators neutral, by size, brightness and a ring
- [x] Hover details in a fixed box; theory menu with short names
- [x] Knots with age: each site's onset read off a held-fraction curve (almost none in infancy, ~⅕ at 35, ~⅔ by the late 50s, → 9 in 10), stress zones first, trees coherent; knots grow with years held; small knots drawn as a warm tint, medium and major as embers
- [x] Deep channels layer: septa, raphes, neurovascular sheaths (22 structures)
- [x] Release: double-click or hold presses (small knots go at once, larger take more); over ~1 s the knots around glide in to fill the space, in waves, each into a less crowded spot nearer the gap (the area evens out; released knots do not return); click selects; shift-click places the window; reset button
- [x] Introduction: a magnified plate of one perforator letting go (chapter 02), linked to its place; the fourteen channels over the deep planes (chapter 07)
- [ ] Release in the introduction; breath gating (release on the out-breath)
- [ ] Stress: a control under which knots re-form (and breath under which they ease) — the dynamic return, shown deliberately rather than on a timer

## Hypotheses in the atlas
- [x] Vascular latch (Johnson): latched arterioles inside muscle (same zones/age curve as perforator knots)
- [x] True-scale cross-section showing where each hypothesis puts the knot (atlas + Hypotheses page)
- [x] Integrated trigger point: knots in taut bands of the muscles Travell and Simons mapped (45 muscle regions, both sides)
- [x] Fascial densification: soft patches in the gliding plane, gathered in the stress zones
- [x] Peripheral nerve: sensitised nerves where they pierce the fascia, beside every medium and major perforator
- [x] Perception: places felt on the skin with nothing beneath, coming and going
- [ ] Referred-pain zones for trigger points; entrapment sites named for nerves

## Maps
- [x] Channels (12 + Du/Ren) and all 361 acupoints (WHO 2008), placed by proportional cun on landmarks; hover card with names, place and nearest anatomy; solo a channel; the anatomy quiets when a map is on (compare chips bring a layer back)
- [x] Sinew channels and their knots (結), after Ling Shu 13: broad bands, knots as diamonds, courses simplified
- [x] Trigger-point map (45 muscle regions, with referred pain) — to compare with the acupoints
- [x] Maps one at a time: a list by tradition, each map's own chips, shared compare chips
- [x] Tender points (1990): the eighteen of the fibromyalgia criteria, placed by definition
- [x] Phones: split screen (figure above, panel scrolling below); tap inspects, double-tap releases, drag turns; nav fits one line
- [x] First-visit hint for release; sharing image regenerated in the current look
- [x] Inner maps, drawn inside the figure and bound to the skeleton (`maps/InnerMap.ts`, `data/subtle.ts`): the microcosmic orbit and three dantian; cakras, nāḍīs and granthis (with where the texts differ); tsa lung — three channels, four wheels as umbrellas, channel-knots, kati. The Traditions page links each section to its map (`/atlas/?map=…`)
- [ ] Dermatomes; myofascial lines
- [ ] Mucalinda's hood and the uṣṇīṣa (iconography layer)

## Site
- [x] Introduction (first version), Hypotheses, Traditions, Library, About
- [ ] Scroll-driven scenes on the introduction (sticky figure changes with each chapter)
- [ ] Knot census chart: burden by age against cutaneous microvascular decline
- [x] Sitemap (`/knots/sitemap.xml`); Research and Simulation in the top bar and indexed
- [ ] Social image per page

## Simulation — the theories against the observations
Plan: `sim/PLAN.md`, reassessed 26 Sep 2026: *can* (every theory through the same exam), *signatures* (what an instrument would
record at a release under each), *decide* (the measurement that settles it, with predictions sealed first). The section's
design: `docs/SIMULATION.md`.
- [x] Stage 0: the plan, the section's design, the Python package (`sim/`, uv) and CI
- [x] PubMed client and library tooling (`knots_sim.pubmed`, `knots_sim.library`); quotes checked word for word (`knots_sim.params --verify`)
- [x] T1 as the vessel switch: 22 parameters (12 sourced, 10 guessed and marked), fitted to the gasp reflex and reactive hyperaemia
- [x] T1, one knot: the switch's band, trials (a knot forms, holds, lets go by easing, by pressure, by uneven breath), robustness (Sobol, 49,152 sets)
- [x] Feasibility checks: hyaluronan cannot hold, cooling cannot release within a breath, the latch does not remember
- [x] Write once: SymPy → numpy and TypeScript, with golden-trajectory tests
- [x] The switch and the bench, live at `/simulation/`; findings note 001
- [x] The perforator theory presented as the simulation found it: the vessel holds itself, the collar does not, breath by drive and by movement
- [x] The movement route in T1, fitted to squeezed arteries; release maps over knot depth for drive and movement; the least movement per breath
- [x] The tree: a parent's knot makes a cluster of its children, its release frees most of them, the hardest stays (256 trees)
- [x] The Research page (`/research/`, in the top bar): the problem, the observations as a dated draft, the theories, what physics allows, breath, trees, what each theory predicts a recording would show, the experiment, what we need
- [ ] M1, the rest: the other breath routes (local nerve, attention, chemistry) in a shared interface; the pulse variant; the field (a patch of perforators under one breath, broad against focused); the exam rewritten by the author
- [ ] M2: T6 and T3; the harness (sweep, scoring); matrix v1; the exam frozen (dated; OSF) and shown sealed
- [ ] M3: T2 live (Hai–Murphy; needs the paper) with latch hardening; T4, T5, the gamma loop, hybrids; matrix v2
- [ ] M4: instrument models; each theory's fingerprint at a release; the decision tree for labs, its predictions sealed
- [ ] M5: clusters and the queue for every theory (how clusters form, let go together, and where they sit); the spatial test (the traditions' maps and trigger points against published perforator maps); network (O8); body (O9, O10); the atlas driven by the model
- [ ] M6: a preprint, with code and results cited by DOI; the lab protocol; outreach to labs and proponents
- [ ] Measure or source what decides the most: the wall's length–tension width and thickness (whether a knot holds at rest); how fast the skin's small arteries ease when drive falls (one breath or many); hairy-skin reflexes

## Open questions (for the author)
- How should manipulation (pressure, breath) return to the atlas, if at all?
- The simulation's open decisions (`sim/PLAN.md` §13): the section's name, and when `/simulation/` joins the top bar; what
  "attention" means in the models; a pilot measurement; a co-author; OSF and Zenodo accounts; reports from other practitioners.
- Papers to get for the simulation: `sim/PLAN.md` §11 (Hai & Murphy 1988; Fredberg 1996 and 1999).
