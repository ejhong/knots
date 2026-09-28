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
- [x] Consistency pass with the field guide's model: the hold is the wall's tone (the collar is the stiffness sleeve only); a knot lets go as the press lifts; a release frees the children it holds, down the tree, never up
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

## Simulation — the field guide
Plan: `sim/PLAN.md` (28 Sep 2026): each theory, run from its own physiology through the same scenes, shows how its knots would
feel, respond and move, and what an instrument would record; where they part, a measurement decides. The pages' design:
`docs/SIMULATION.md`. The exam phase (26–28 Sep: every theory scored against the author's reports) is retired, and its plan
kept in `sim/archive/`; what it built (the models, the parameters and their sources, the checks, the instrument readings) carries over.
- [x] Built before the turn: the vessel switch from measured numbers (12 sourced, 10 guessed), the checks (hyaluronan cannot hold;
  warming cannot release within a breath; the latch economises), the tree, how a knot sets, trigger points, perception and the
  motor switch as models; the PubMed library tooling; the vessel bench
- [x] G0: the plan; the exam, the matrix and the author's words off the site; the Research page made lean
- [x] G1 (first version, 28 Sep): the engine (patch, scenes, senses, a runner per theory, traits) for T1, T3, T6, T7; the field guide on `/simulation/`; the vessel bench moved to `/simulation/vessel/`
- [x] Subtle breaths with attention as a scene; conducted dilation in the vessel tree (a child's release does not free its parent; a
  parent's frees most of its children); what a breath would have to do, per theory
- [x] The Hypotheses and Simulation pages merged (28 Sep): each theory's account beside what its model shows, with its switch; the
  instrument at the top; `/simulation/` redirects
- [x] The vascular latch (T2) as a model: Johnson's loop, a held prediction kept by the clamp that cuts it off from awareness
- [x] G2 (28 Sep): Research rebuilt around where the seven theories part (generated from the guide), the measurement ladder for all seven, the physics checks (acidity, warmth, the sympathetic delay, pressing a nerve), and the perforators up close
- [x] Densification (T4) and nerves (T5) as models (28 Sep): all seven theories in the guide
- [x] The perforator's sleeve (stiffness), two scenes (rolling the knot, warmth), and the reports set against the models (28 Sep)
- [ ] G3, the rest: the motor switch with the vessel it squeezes; the latch's own rate constants (Hai and Murphy)
- [ ] G4: the atlas driven by the models, theory by theory
- [ ] G5: the fascia as a second system (its own phase and safety review)
- [x] G6, drafted (28 Sep): a preprint (`/research/preprint/`), a one-page pilot protocol (`/research/pilot/`), both with PDFs, and the groups who could help, on the Research page
- [ ] G6, next: the author's review; pre-registration; approaching a lab (the author's call)
- [ ] Measure or source what decides the most: the wall's length–tension width and thickness; how fast the skin's small arteries
  ease when drive falls; how hard a few latched motor units squeeze a vessel beside them

## Open questions (for the author)
- Pressed, with a slow out-breath: does a knot let go while the hand still presses, or as it eases off? The theories split on it.
- How should manipulation (pressure, breath) return to the atlas, if at all?
- The simulation: a pilot measurement; a co-author; reports from other practitioners (`sim/PLAN.md` §10–11).
- Papers to get: Hai & Murphy 1988 (the latch's rate constants, for T2).
