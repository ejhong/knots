# Simulation plan: from mystery to experiment

*Status (26 Sep 2026): reassessed from scratch. Stage 0 is done. The first model, T1 as **the vessel switch**, is built from
sourced parameters, validated against measurements, checked for robustness, and live at `/simulation/` (unlisted); four
feasibility checks are answered (`findings/001-can-a-perforator-hold.md`). The aim now reaches past "which theory can" to "what
would settle it": the measurement a lab should make first, with each theory's predicted result sealed in advance. Written from
the author's brief ([BRIEF.md](BRIEF.md), verbatim) and reassessed against this repo; where the two differ, this plan holds. A
number marked (verify) has no source yet: source it before using it.*

## 0. The objective

**The mystery.** People who work with the body find knots: places that hold for years and let go in a breath or under a hand,
with a spark; sometimes many at once and sometimes one place at a time; some easily and some only over many breaths; more with
age and stress. There are six serious answers on this site and a few more below. None has been caught in the act: nobody has
recorded what changes, where and when, at the moment a knot lets go.

**What would solve it** is a measurement, not a model: a recording at the moment of release (blood flow at each depth, tissue
stiffness, muscle and nerve activity, skin temperature, the breath, and where the release is felt). Each theory predicts a
different recording. The one that matches, at several sites and in several people, is the answer or the start of one.

**What simulation can do, and nobody has done,** is make that measurement decisive before anyone makes it:

1. **Can.** Every serious theory, in its strongest form and its variants, through the same trials against the same
   observations, every number sourced. What the physics allows and forbids becomes known rather than argued; a theory that
   cannot produce what people report is set aside, with the reason.
2. **Signatures.** For each theory that can, what an instrument would record at a release: its fingerprint.
3. **Decide.** Which measurement separates the survivors most cheaply, how many release events it needs, and the predicted
   result under each theory, sealed before any data. The output is a decision tree a lab can pick up: measure this first; if
   you see A, next measure that.

**Honest scope.** No model observes a knot. The strongest claims available are *cannot* (no plausible parameters produce an
observation) and *would show* (what a measurement would record if a theory is right). *Is* waits for data, so the plan ends in
a lab, and perhaps first in a pilot the author runs.

**Why now, and why AI.** The work is broad and exacting at once: every theory steelmanned and attacked; hundreds of parameters,
each with a verified quote; millions of runs; models of the instruments; a site and a paper regenerated whenever the evidence
changes. That part AI can carry. The human anchors are the author's observations (the exam), a physiologist co-author, the
proponents of each theory, and a lab.

## 1. Findings so far

1. **The vessel can hold itself.** A small artery with tone in its wall has two stable states over a band of tone (Burton
   1951): with measured numbers the band is 0.21–0.40 of maximal tone, just above rest (0.17). An open vessel snaps shut above
   the fold and a shut one stays shut until tone falls below the reopening threshold: *held until released*, from mechanics
   alone. A switch in 72% of 49,152 plausible parameter sets; a hold even at resting tone in 44%. Whether a knot can hold at
   rest is decided mostly by the width of the muscle's length–tension curve and the wall's thickness (both guesses today,
   both measurable in a myograph).
2. **Hyaluronan cannot hold it.** A liquid resists motion, not position; even at synovial-fluid viscosity its drag is about
   12 times too weak. T1's collar is not the hold. (This does not test T4, whose claim is about glide.)
3. **Cooling cannot release it within a breath** (warming takes ≥ 44 s even at maximal skin flow).
4. **The latch economises; it does not remember** (relaxation follows calcium; rembold1991). It may still matter: see 7.
5. **Predictions**: a local flush at release (laser speckle); pressure-then-release faster and brighter than calm; slowing
   near the fold; breath releases knots through drive only if its effect on drive is uneven. O2 (pressure, then release) is
   reproduced well; O1 only in part (below).
6. **Breath through drive** (exploratory runs, 26 Sep; to become trials P10–P12). Tone rises within seconds and eases over
   about half a minute (the gasp reflex: mayrovitz2026), so an even breath keeps knots held. A breath that lowers drive more
   than it raises it releases *easy* knots (just above their threshold) over 3–5 breaths; knots a fifth of the way up the
   band need a stronger or sustained drop; knots two-thirds up held under every variant tried. That matches O1's "many small
   ones, not the large deep ones", but not its speed: release within one exhale needs either faster easing than the fitted
   value (with easing at 3 s instead of 14 s, easy knots go in 10–12 s) or a local route acting on the wall itself (a 40% cut
   in the wall's force on each out-breath releases easy knots in 11 s and middling ones in 20 s). *One breath or many* hinges
   on one number, how fast the skin's small arteries ease when drive falls, which is fitted today to a single recording.
7. **Movement is a second route, from the literature.** Rhythmic stretch cuts vascular smooth muscle's active force at once
   (ljung1975, rat portal vein and rabbit aorta); muscle feed arteries squeezed shut widen within seconds of release, more
   after five short compressions than after one long one (clifford2006); a larger pulse at the same mean pressure widens toned
   arterioles (goto1996); aortic smooth muscle de-stiffens after bouts of cyclic stretch and re-stiffens slowly (neutel2023).
   In airway smooth muscle the breath's own stretch keeps the muscle from freezing (fredberg1999), and the latch is a
   low-friction state that deep breaths fail to reverse (fredberg1996). None of this has been measured in a perforator.
8. **Trees make clusters and queues** (exploratory runs, 26 Sep, small trees with guessed resistances; to become the network
   stage). *Siblings on one feed protect each other:* each closure raises the pressure that holds the others open, so a surge
   shut only 2 of 8 siblings, and releasing a knot did not shut a neighbour in its place. *A parent and its children behave
   differently:* when a local surge shuts a parent vessel, the pressure below it collapses (to about 20 mmHg) and all four of
   its children snap shut within seconds, a cluster from one knot. When the parent is released, the pressure below surges and
   most of the children pop open within 1–2 s, the cluster letting go together; the hardest children (thickest walls) stay
   shut under raised drive and surface as the next knots, going only when drive falls. That is the reports' queue ("released
   and then, as if from a queue, replaced by others") and the release of an old cluster all at once, both from the tree's
   hierarchy, not from anything added for them. Holding spreads downstream (a parent's closure shuts its children); a
   release upstream frees most of what lies below it; conducted dilation (segal1986, not yet run) would carry release
   upstream, toward the root, where the tree's paths converge. The author has felt a parent release many children (O13),
   recorded after these runs were shared.

**A hypothesis these suggest** (to be run through the same exam as everything else, not assumed). Knots form where drive is
raised and the tissue is still. A shut vessel loses the pulse that stretches its wall with every heartbeat, and so may hold
harder than an open one (a second loop that widens the band). The longer it is held, the more of its muscle latches and the
less movement can shake it (old knots harder than fresh ones). Breath releases in two ways: by lowering drive everywhere
(broad) and by moving the tissue where the knot is (focused), cumulatively over breaths. Its predictions: release follows
local tissue strain; the regions that move least with the breath hold the most knots; a knot's difficulty grows with how long
it has been held. It favours no theory in advance: T3 (stretching a taut band), T4 (hyaluronan thinning as layers glide) and
T5 (nerve gliding) also release with movement, and differ in what the movement changes.

## 2. Breath, kept open

The author's observations: breath releases knots; the release can be broad or focused; some knots go in a breath and others
take many; the breath that does it is a learned, proprioceptive skill. *How* the breath acts is not assumed. It enters every
model as a set of routes, each a variant, and the data decide between them.

| Route | Acts on | Reach | Theories that can use it | Sources |
|---|---|---|---|---|
| B1 Drive | sympathetic drive to the skin's vessels; motor drive to muscle | everywhere at once | T1, T2, T3, T6 | bolton1936, lau1995, mayrovitz2026 |
| B2 Movement | the breath's stretch and compression of the tissue | where the tissue moves | T1, T2 (the latch resists it), T3, T4, T5 | ljung1975, clifford2006, goto1996, neutel2023, fredberg1996, fredberg1999 |
| B3 Local nerve | sensory nerves releasing dilators in one place | one place | T1, T5 | lorenzo2007 (the nerves carry reactive hyperaemia); a breath-driven trigger has no source |
| B4 Attention | what is felt, with no change in the tissue | anywhere | T6 | to define with the author (D4) |
| B5 Chemistry | carbon dioxide (overbreathing) | everywhere | T6 (tingling anywhere); T1–T3 (CO₂ and small vessels: verify) | source needed |

- **Skill** enters as the parameters practice could change: how much an out-breath lowers drive and how little the in-breath
  raises it; how long drive stays down; where the breath moves the tissue, and how much. The models then say what a skill
  would have to change to reach harder knots. That describes; it does not prescribe.
- **Easy and hard knots** are part of every test: a knot's difficulty is how far the drive holding it sits above its own
  release threshold, and, in the latch variants, how long it has been held.
- **What tells the routes apart.** B1 changes flow at sham sites too; B2 follows local tissue strain (ultrasound speckle
  tracking during the breath); B3 flushes one place with no change in drive or strain; B4 changes nothing measurable in the
  tissue; B5 follows end-tidal CO₂.

## 3. Full coverage: the theories

**The six on the site**, each already written in its strongest form (`src/data/hypotheses.ts`):

| ID | Site id | Core state variables | Candidate switch | Starting references |
|---|---|---|---|---|
| T1 | `perforator` 結 | lumen radius, smooth-muscle activation, oxygen debt, sensory-nerve dilator, myogenic relaxation (built) | the vessel's own mechanics (built) | burton1951, bolton1936, taylor1987, segal1986 |
| T2 | `latch` 閂 | Hai–Murphy cross-bridge states, Ca²⁺, MLCK/MLCP balance | the latch-bridge state | johnson2023 (an essay), hai1988, rembold1991, fredberg1996 |
| T3 | `trigger-point` 点 | endplate ACh leak, sarcomere contracture, local ischaemia, ATP, sensitising substances | the energy-crisis loop | gerwin2004, shah2005, sikdar2009 |
| T4 | `densification` 膠 | HA viscosity as a function of pH, temperature and shear; layer glide | HA rheology, if hysteretic | stecco2011, stecco2014, langevin2011 |
| T5 | `nerve` 神経 | a sensitised nerve where it pierces the fascia; ectopic firing | possibly none | quintner1994, quintner2015 |
| T6 | `central` 覚 | dorsal-horn gain, descending modulation, wind-up; attention; CO₂ and overbreathing | a central gain loop | woolf2011; overbreathing and paraesthesia (source needed) |

**The census.** Full coverage means every serious candidate mechanism is a theory, a variant, or excluded with a stated reason,
in a public table:

| Candidate | Where it enters |
|---|---|
| Movement-starved smooth muscle: breath and pulse keep it fluid, stillness lets it freeze (ljung1975, goto1996, fredberg1999) | variant of T1 and T2 |
| The latch as hardening: latched muscle resists release by stretch (fredberg1996, hai1988) | variant of T1 and T2 |
| The gamma loop: metabolites of static contraction drive the gamma system and the spindles, raising stiffness and metabolites again, and spreading to other muscles (johansson1991) | T7, or a variant of T3 and T5; its spread is a candidate for O8 |
| Fascial contractility: fascia contracting like smooth muscle (schleip2005) | variant of T4; slow |
| Structural adhesion or fibrosis | a control that should fail: it cannot release in seconds. It shows the exam has teeth |
| Hybrids: local switches plus a global loop (held units raise drive everywhere) | H |

- T6 is the site's **Perception** theory, broader than central sensitisation: attention, sleep and overbreathing (which makes
  tingling anywhere) are part of it. Model that version. It is the physician's first answer and the account every other view
  has to beat, so it runs early.
- **Fairness, made operational.** Each theory gets an advocate pass (the strongest version and variants that could pass) and
  a critic pass (what breaks it), with the same trials, the same instrument models and the same documentation. Where turning
  words into equations is a choice, at least two variants, all reported. Proponents are invited to challenge their
  formalisation: Johnson for T2, the Padua group for T4, trigger-point and pain researchers for T3, T5 and T6.
- A plausible, publishable outcome: no single theory passes everything, and a hybrid does: a local switch that holds, with
  the nervous system setting its drive and much of what is felt.

## 4. The exam (draft)

The tests are drafts **for the author to rewrite in their own words**, mechanism-neutral: an observation says what happens,
never how. The author reviews them; then they are **frozen** (`observations/spec.yaml`, with a version and a date, committed
and preregistered on OSF) before any sweep. After that they change only by a new, dated version, and every result names the
version it used. Evidence: **M**, measured in the literature; **S**, self-report.

| ID | Observation | Draft test | Evidence | Notes |
|---|---|---|---|---|
| O1 | Breath release | With the breath, held units let go. The release can be broad (many units at once, across the body) or focused (one region). Easy units go within a breath or two; hard ones over many breaths, or not at all. The ability grows with practice. | S (the breath-linked constriction itself: M, bolton1936) | How the breath acts is left to the routes (§2). The size and difficulty dependence is part of the test. |
| O2 | Pressure, then release | Sustained local pressure (tens of seconds), then release, flips the unit, faster than calm alone. | S (reactive hyperaemia: M) | |
| O2b | Attention | Focus alone, without pressure or movement, releases a unit. | S | To define with the author (D4); may belong to O1's focused release. |
| O3 | Water | Hydration lowers the release threshold or speeds release. | S | Expect most theories to be silent; report silence as silence. |
| O4 | Stress | Sustained higher drive increases the number of held units, concentrated where baseline tone is higher (neck and shoulders, jaw, belly, low back). | S | |
| O5 | Stiffness | Held units reduce range of motion; a stretch meets them as a dull block. | S | Partial; mostly the fascia phase. |
| O6 | Sparks | Release produces a brief burst of afferent firing (tingling) over the unit's own patch of skin. | S (post-ischaemic paraesthesia: M) | Must be spatial: overbreathing makes tingling anywhere (T6), so only tingling confined to the released patch discriminates. |
| O7 | Euphoria | Out of scope for tissue-level models; noted only. | S | |
| O8 | Migration and the queue | Releasing one unit changes others: some flip to held, others let go; the territory evens out; at some places knots are released and then replaced by others, as if from a queue. | S | Network stage. Where the new knots appear (siblings, the unit's own branches, anywhere) is part of the test. |
| O13 | A parent releases its children | Releasing one knot (a parent) lets many others (its children) go with it. | S (the author, first-hand; recorded 26 Sep 2026) | Written down after the exploratory tree runs (finding 8) were shared, so the vascular model's match is found after the fact, not predicted blind. For the author to add in their own words: how many children, how soon after the parent, where they lie relative to it, and whether some stay held. Those details, and measurements at such a release, are the blind tests. |
| O14 | Clusters in place | Knots come in clusters that gather at particular places (the base of the skull most of all); an old, heavily loaded cluster can let go with a wave of warmth spreading from the site. | S (the essays) | Tests: cluster sizes, where clusters sit, what releases together and in what order. |
| O9 | Mirroring | Releasing units on one side increases release or range of motion on the other. | M (kelly2016, konrad2023) | konrad2023 puts the effect down most likely to reduced pain perception; take the effect size and its duration (kelly2016: up to 10 min) from the studies themselves. Body stage. |
| O10 | Age | The held fraction grows with age; young knots small and transient, old ones large and persistent. | S (age changes in sympathetic tone and reactivity: M, verify) | The atlas's age curve is illustrative, not data. |
| O11–12 | Peeling, filling | Deferred to the fascia phase. | S | |

**Fair across scales.** A central theory has no "unit" in the tissue. Each test is stated as something that can be felt or
measured, and each theory maps its own states onto those observables: once, in the interface, reviewed for fairness.

## 5. The shared interface and the trials

Every theory takes the same inputs and gives the same outputs, or the comparison is not fair.

- **Inputs:** drive S(t) (a baseline plus the breath's routes B1–B5, §2); local pressure P(t); local tissue strain ε(t) (the
  breath's movement, stretch, touch); skin temperature; hydration; age; attention (D4).
- **Outputs, felt:** held or released (or a continuous held-ness); palpable hardness; tenderness; sparks and their extent.
- **Outputs, measured** (for the signatures, §6): perfusion at each depth; skin temperature; tissue stiffness; muscle
  activity (EMG); skin sympathetic nerve activity; end-tidal CO₂; at network scale, the neighbours and the other side.

**Trials** (on the site: *trials*; describe, never prescribe). Identical for every theory:

| ID | Trial |
|---|---|
| P1 | Slow breathing |
| P2 | One deep breath and a slow exhale |
| P3 | Sustained pressure, then release |
| P4 | A chronic stress ramp |
| P5 | An ageing sweep |
| P6 | Release one unit in a network; watch its neighbours |
| P7 | Treat one side; watch the other |
| P8 | A change in hydration |
| P9 | A slow approach to release, drive lowered breath by breath, to look for critical slowing down |
| P10 | *Added:* focused movement: rhythmic local strain or compression at the breath's pace, at one site, with drive unchanged |
| P11 | *Added:* practice: the breath's parameters swept (asymmetry, depth, how long drive stays down, where it moves the tissue) |
| P12 | *Added:* old and new: the same unit held for a minute, an hour, a year of model time, then the same release |
| P13 | *Added:* release a root: free the unit at the top of a tree (or of a cluster) and watch everything below it |

## 6. The decisive experiment

**Instrument models.** Each measurement modelled with its depth, resolution in space and time, and noise, so that each
theory's prediction is what the instrument would actually record:

- laser speckle contrast imaging and laser Doppler (superficial skin flow, sub-second)
- thermal imaging (skin temperature; slow, per the cooling check)
- high-frequency ultrasound Doppler and near-infrared spectroscopy (deeper flow)
- shear-wave elastography (stiffness, many frames a second)
- ultrasound speckle tracking (local tissue strain during the breath: the test of route B2)
- surface EMG, skin sympathetic nerve activity (microneurography), a breath belt and end-tidal CO₂

**The keystone design** is the author's Tier 1 experiment (docs/source, the vasocomputation essay): stiffness and flow under a
load-cell probe over a knot, with the breath, EMG and a button pressed at each felt release; controls of pressure with a held
breath, breath without pressure, sham sites, and failed attempts. For each surviving theory and variant: the predicted traces
around a release, drawn side by side.

**Discrimination.** For each pair of theories: which signal differs most, by how much against the instrument's noise, and how
many release events are needed to tell them apart (simulated), at what cost. From these, the **decision tree**: the cheapest
measurement that splits the most theories first. A likely first split, to be checked: *is there a local change in the tissue
at release?* (T6 predicts none.) Then *at what depth, and in what* (flow in the skin: T1; flow or stiffness in the muscle: T2,
T3; glide: T4; nerve: T5). Then *which breath route*: strain, drive or neither.

**Sealed predictions.** Before any data, the predicted outcomes are frozen (OSF, dated) and shown sealed on the site.

**A pilot** (D5, the author's choice, under the site's moderation guidance): a thermal camera and a photoplethysmography
sensor over a knot and over a sham site, a breath belt, and a button at each felt release. The models predict its outcome for
each theory first.

## 7. Space and the body

- **The field:** a few hundred vessels, each with its own wall drawn from the plausible ranges, under one breath: easy and
  hard knots letting go in their own time; broad and focused release; neighbours sharing flow through a synthetic tree
  (Poiseuille, conducted dilation): O8.
- **Existing maps as data.** Do the traditions' knot maps (sinew-channel knots, acupoints), trigger points and tender points
  sit where perforators and cutaneous nerves pierce the fascia, more often than chance? Tested against *published* perforator
  maps (not the atlas's generated ones, which would be circular) with a proper null. T1 and T5 predict the same places (the
  vessel and the nerve travel together), so this separates them from T3 and T6, not from each other.
- **Clusters** (O8, O13, O14): how clusters form, what lets go together, the order of release, the queue, cluster sizes, and where
  clusters sit, run for every theory. The vascular theories get clusters from the tree (finding 8); trigger points from key
  points and their satellites; densification from patches and the folds that travel through them; nerves from a nerve's
  territory; perception from attention moving to the next loudest place. Each predicts a different signature: a flow surge
  over the whole cluster within seconds of its root's release, and warmth spreading from the site over about a minute
  (vascular); a twitch and a change in muscle stiffness (trigger points); nothing in the tissue (perception).
- **The body:** mirroring (O9) and age (O10); the atlas driven by the model, labelled as such, in place of KnotSim's
  illustration.

## 8. Method

1. **Parameter tables** (`params/<theory>.yaml`): name, symbol, units, value or range, source (a `papers.json` id), locator,
   the quoted sentence or cell, a confidence (measured, inferred, fitted or guessed) and notes. Never a number from memory.
2. **Sample** 10⁴–10⁵ parameter sets per theory and variant (Sobol or Latin hypercube; SALib).
3. **Run the trials** and score each observation: pass, fail or graded; *silent* where a theory makes no claim.
4. **Report, for each theory and observation:** *existence* (does any plausible set pass?); *evidence* (the share of the prior
   volume that passes, and the joint pass rate: under approximate Bayesian computation this share is the model evidence and
   already penalises flexibility, so no second complexity penalty is added); *prior sensitivity* (how the evidence moves when
   the prior ranges move).
5. **What would have to be true:** each theory's passing parameter region beside the literature's ranges. A theory that passes
   only with an unmeasured parameter in a narrow range has made a prediction: measure that parameter.
6. **Robustness to the exam:** vary each tolerance across its bounds; headline only what holds.
7. **Sensitivity** (Sobol indices): which parameters decide each pass.
8. **Bifurcation and continuation** for every switch. The first deliverable for each theory is its diagram in drive: is there a
   bistable region, where are its folds, how wide is the loop? A theory with no switch cannot give "held until released" at any
   parameters; one whose only hold is structural cannot release in seconds. These structural results come before statistics.
9. **Signatures and discrimination** (§6).

## 9. The path

Five tracks run together. Each ends in something on the site.

| Track | What | Done when |
|---|---|---|
| A Coverage | the census; each theory by advocate and critic, with variants; the harness (sweep, scoring) | every row of the census is run or excluded with a reason; matrix v2 |
| B Exam | the author's observations, mechanism-neutral; frozen and sealed | spec v1 sealed (dated, OSF) before the first sweep |
| C Decide | instrument models; signatures; discrimination; the decision tree; sealed predictions; the pilot | a lab-ready protocol with predicted outcomes |
| D Space | the field; existing maps as data; the body; the atlas driven by the model | O8–O10 run; the spatial test reported |
| E Site and paper | the section built out as the work lands; a preprint | preprint submitted, code and results cited by DOI |

**Milestones.**

| | Milestone | Needs |
|---|---|---|
| M1 | Breath routes in the interface; T1 with movement (B2) and the pulse variant; P10–P12; the field, first version; the exam drafted for the author | nothing new |
| M2 | T6 and T3 behind the interface; the harness; matrix v1 with T1, T3, T6; the exam sealed | the author's review of the exam |
| M3 | T2 live (Hai–Murphy) with the latch-hardening variant; T4, T5, the gamma loop, hybrids; matrix v2 | the papers (§11) |
| M4 | Instrument models; signatures; the decision tree; sealed predictions | M2 at least |
| M5 | Clusters and the queue for every theory (O8, O13, O14, P13); the spatial test with published maps; network; body; the atlas driven by the model | digitised perforator maps |
| M6 | The preprint; the lab protocol; outreach to labs and proponents | a co-author (D6) |

## 10. On the site

The section grows into the site's third act: the atlas shows what a knot might be, Hypotheses gives the answers, and the tests
show what each answer can do and what would settle it (`docs/SIMULATION.md`). As the work lands:

1. **The question:** held for years, let go in a breath.
2. **The exam,** sealed.
3. **The bench:** one instrument, every theory, the same controls (the breath with its routes, stress, press, movement).
4. **The matrix:** who can do what; tap a cell for why.
5. **Fingerprints:** what each theory predicts an instrument would record at a release.
6. **What would settle it:** the decision tree, with the predicted outcomes sealed; a one-page summary for labs.
7. **The field:** broad and focused breath across a patch of skin; clusters forming and letting go together; the queue; later, the whole body.
8. **How it is made:** method, parameters and sources, the run log, code, the preprint.

The Hypotheses cards gain a line each, *In the tests*, linking to their row. The perforator card now presents the theory as
the simulation found it (the vessel holds itself; the collar does not; breath by two routes). The atlas runs on the model at
M5. The top-bar link comes when the author says (D2); the natural moment is matrix v1.

## 11. Next steps

- **Done now (26 Sep):** this plan; the perforator theory as presented on the site (card, introduction, plate, About);
  eight papers verified and added to the library (movement, the latch, the gamma loop).
- **Next sessions (no papers needed):** M1, then M2. Breath routes in `knots_sim/interface.py`; the movement route and the
  pulse variant in T1 (ljung1975, clifford2006, goto1996, neutel2023 for their shapes and sizes); P10–P12 as trials; the field
  in Python and on the bench; the exam drafted in `observations/spec.yaml` for the author; then T6 and T3.
- **At home, with the papers:** T2 live, and the latch-hardening variant; then T4, T5 and the gamma loop.
- **Then:** the instrument models and the decision tree; the pilot, if the author chooses; the preprint and the labs.

**Papers to get** (the author, at home; put PDFs in `sim/private/`, which git ignores; or paste the pages needed):

1. Hai CM, Murphy RA (1988). *Cross-bridge phosphorylation and regulation of latch state in smooth muscle.* Am J Physiol
   254:C99–C106. https://doi.org/10.1152/ajpcell.1988.254.1.C99 (library: hai1988). The latch's rate constants; needed to run T2.
2. Fredberg JJ, Inouye DS, Mijailovich SM, et al. (1999). *Perturbed equilibrium of myosin binding in airway smooth muscle and
   its implications in bronchospasm.* Am J Respir Crit Care Med 159:959–967. https://doi.org/10.1164/ajrccm.159.3.9804060
   (fredberg1999). The model of how the breath's stretch keeps smooth muscle from freezing; for the movement route.
3. Fredberg JJ, Jones KA, Nathan M, et al. (1996). *Friction in airway smooth muscle: mechanism, latch, and implications in
   asthma.* J Appl Physiol 81:2703–2712. https://doi.org/10.1152/jappl.1996.81.6.2703 (fredberg1996). The latch under
   stretch; for the latch-hardening variant.

Add to this list as the models need more.

## 12. Engineering

- **Python ≥ 3.11 with uv** (`sim/pyproject.toml`, `sim/uv.lock`): numpy, scipy, sympy, SALib, pyyaml. Numba or JAX later, if
  sweeps need them. Continuation with a small pseudo-arclength method checked against normal forms, or AUTO-07p.
- **Write each model once,** in SymPy. From it come the numpy functions for sweeps and continuation, a TypeScript module for the
  bench (`src/sim/models/*.ts`, generated, do not edit) and the equations typeset for the site. Golden-trajectory tests hold
  the TypeScript to the Python.
- **Results.** Every run writes `results/<run-id>/manifest.json` (inputs hash, exam version, package versions, date).
  Summaries go to `src/data/sim/*.json`, small and committed; the site reads only these. Raw outputs stay out of git. One
  command regenerates everything (`uv run python -m knots_sim.export`).
- **The Pages build runs no simulation.**
- **Citable versions.** A Zenodo DOI for each release; an OSF preregistration for each frozen exam and each set of sealed
  predictions. Both need the author's accounts.
- **CI** (`.github/workflows/ci.yml`): the sim tests on every push; the site checks on branches other than `main`.

## 13. Open decisions (for the author)

- **D1** The section's name: *Tests*, *Trials* or *Simulation*? (The page is at `/simulation/`.)
- **D2** When the section joins the top bar (the natural moment: matrix v1).
- **D3** Python with generated TypeScript: built, and held to the same trajectories by a golden test.
- **D4** What "attention" means in the models (route B4; O2b).
- **D5** A pilot measurement (§6): whether, how, and under the moderation guidance.
- **D6** A co-author (physiologist or modeller), and inviting proponents to review their theory's formalisation.
- **D7** OSF and Zenodo accounts.
- **D8** Reports from other practitioners (a structured form: timing, size, place, which breath), to widen the exam beyond
  one person's observations; it needs a privacy note and the moderation guidance.

## 14. Caveats to carry into the paper

- Most observations are self-report. Label them, and weight measured constraints more heavily.
- Consistency is not truth. Conclusions take the form "can or cannot, and at what parameter cost", and "would show".
- The theories differ in scale (tissue, spinal cord, brain); the interface must be fair to each.
- Turning a theory into equations is a choice. Report the variants; invite the proponents.
- Evidence from other tissues (airway smooth muscle, the aorta, muscle feed arteries) suggests routes; it does not show them in
  a perforator.
- Nothing here is medical advice, and the site's moderation caution applies to any measurement involving people.

## 15. Working notes

- **References** go into `src/data/papers.json` only from PubMed E-utilities output (CLAUDE.md), via `knots_sim.library`.
  Full texts: PMC or Europe PMC where open; paywalled papers the author supplies go in `sim/private/`, which git ignores.
- **Cloud sessions** (claude.ai/code) block the literature hosts under the default network policy. Allow
  `eutils.ncbi.nlm.nih.gov`, `www.ncbi.nlm.nih.gov`, `www.ebi.ac.uk`, `api.crossref.org`, `doi.org`, `api.openalex.org`,
  `api.biorxiv.org` and `api.semanticscholar.org` in the environment's network settings. A session-start hook
  (`.claude/hooks/session-start.sh`) installs the npm and Python dependencies there. A local machine needs neither.
- **The exploratory runs** of 26 Sep behind findings 6 (breath) and 8 (trees) are kept as run in `sim/exploratory/`; they are
  not tests. M1 and M5 turn them into trials with tests.
