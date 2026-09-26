# Simulation plan: from mystery to experiment

*Status (26 Sep 2026): reassessed from scratch; M1 largely done. T1, **the vessel switch**, is built from sourced
parameters, validated, checked for robustness, and now carries the breath's movement route (fitted to squeezed arteries)
and a tree of a parent and its children. The results are on the site: the bench at `/simulation/`, and the case for
researchers at `/research/` (in the top bar), with the observations as a dated draft (`observations/spec.yaml`).
Findings notes 001 and 002 are generated from the run. The aim reaches past "which theory can" to "what would settle
it": the measurement a lab should make first, with each theory's predicted result sealed in advance. Written from the
author's brief ([BRIEF.md](BRIEF.md), verbatim) and reassessed against this repo; where the two differ, this plan
holds. A number marked (verify) has no source yet: source it before using it.*

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

1. **The vessel can hold itself, but in healthy vessels only under strong, sustained tone.** A small artery with tone in
   its wall has two stable states over a band of tone (Burton 1951). With the length–tension curve measured in small
   arteries (mulvany1979: active force falls to zero at 0.38 of the optimal length) and the wall of healthy human
   subcutaneous small arteries (schiffrin1995: media 5.2% of the lumen), the band is 0.62–0.93 of maximal tone, 3.4 times
   resting tone at its lower edge; with the thicker walls of hypertension (8%) it falls to 1.8 times rest, and a knot
   holds at rest only with media about 12% of the lumen. A switch in 52% of 49,152 plausible parameter sets; a hold even
   at resting tone in 6%. (With the earlier guesses, 72% and 44%.) What decides it is how much force the muscle keeps
   at the very short lengths of a nearly shut vessel, which nobody has measured in a skin perforator; then how tightly
   the lumen closes (guessed: closed to 0.04 of the relaxed radius, 1.8 times rest; to 0.15, 4.8 times). A vessel that
   cannot close past its fold (0.19) has no hold at all: narrowed is not held.
2. **Hyaluronan cannot hold it.** A liquid resists motion, not position; even at synovial-fluid viscosity its drag is about
   12 times too weak. T1's collar is not the hold. (This does not test T4, whose claim is about glide.)
3. **Cooling cannot release it within a breath** (warming takes ≥ 44 s even at maximal skin flow).
4. **The latch economises; it does not remember** (relaxation follows calcium; rembold1991). It may still matter: see 7.
5. **Predictions**: blood returning to the spot within seconds of release, from near nothing (laser speckle), rising above
   resting flow only as tone falls; pressure-then-release faster than calm (not brighter, with the measured wall); slowing
   near the fold; breath releases knots through drive only if its effect on drive is uneven. O2 (pressure, then release) is
   reproduced well; O1 only in part (below).
6. **Breath through drive** (now trials in `knots_sim/breath.py`, findings 002). Tone rises within seconds and eases over
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
8. **Trees make clusters and queues** (now `knots_sim/models/tree.py`, findings 002: across 256 plausible trees, a cluster
   whenever the parent holds, most of it freed within 5 s of the parent's release in 59%, something left behind in 84%). *Siblings on one feed protect each other:* each closure raises the pressure that holds the others open, so a surge
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
9. **Held long enough, a knot can set** (`knots_sim/adapt.py`, `params/adapt.yaml`, findings 003). Smooth muscle held at a
   new length adapts to it (syyong2008: 73% of the lost force regained at 0.6 L; pratusevich1995; bednarek2011), and
   arterioles held constricted for 4 h no longer relax fully (martinezlemus2004, hill2003); days of tone remodel the lumen
   inward (bakker2002). As a two-timescale variant (the muscle's optimum follows the held length, share 0.70 fitted to
   syyong2008, time constant 1 h bracketed by martinezlemus2004): a knot held shut at 4× resting tone holds at rest after
   1.7 h, outlasting its stress; held 1 h it lets go when stress ends, 3 h it stays. Fully adapted it holds down to 0.5×
   rest. Released, a set knot opens wide (2.8× resting flow; a new one's, 1×; one released before it set reopens narrowed,
   as the lab's arterioles did). Across 512 settings: of the switches, 86% can set, median 2.2 h at mid-band tone. Three
   days' inward remodelling alone brings the hold from 3.4× to 1.8× rest. **What it gets wrong:** at constant drive the
   model's *open* vessels creep shut under sustained tone (1.5× rest: 14 h), but the lab's arterioles held at 61% for 4 h
   kept their diameter (the model's would have shut in 1.7 h). In an open vessel adaptation must make holding cheaper, not
   narrower (activation easing, or flow and metabolism; vanbavel2014). So stress making knots without a surge (O4) is not
   shown, and how long a released knot's flush lasts is not known; the shut-vessel results do not depend on the missing loop.
   It resolves finding 1's tension (a hold that needs 3.4× rest) through time, and bears on O10, known in advance.
10. **What the perforation adds, if the switch is shared with the latch** (reasoning, not yet run; the author's question).
   The hold is the same smooth muscle either way; the piercing is mechanical and positional. A vessel pinned where it
   pierces the fascia, with the layers sliding past, would take a concentrated share of movement, stretch and a roller's
   shear, and a change of shape is what loosens the wall (clifford2006); a firm plane behind it lets pressure reach it and
   makes it palpable as a point; its nerve pierces beside it (tenderness, the spark); it heads a tree (clusters). A set knot
   needs pressure or movement to let go, which a piercing is placed to receive; the same hold deep in muscle or in the brain
   would be out of reach and not felt as a point. As a variant: a strain gain on the movement route at a piercing (guessed
   until measured). The measurement: ultrasound speckle tracking of a perforator's wall at its piercing against a vessel
   within a layer, under a roller or a breath; it is also the unmeasured `breath_move`. A first probe
   (`exploratory/2026-09-26-set-knot-rolling.py`): at resting tone, breath movement of up to a full squeeze per breath does
   not free a fully set knot (loosening at most 0.44; it needs about 0.5), where a roller's pass each second frees it in
   5–25 s (loosening 0.62–0.87); a knot just set goes with either. Old knots need fast, large changes of shape, and a
   piercing is where those would concentrate. To be run as trials with the strain gain (M1).

**A hypothesis these suggest** (to be run through the same exam as everything else, not assumed). Knots form where drive is
raised and the tissue is still. A shut vessel loses the pulse that stretches its wall with every heartbeat, and so may hold
harder than an open one (a second loop that widens the band). The longer it is held, the more its muscle adapts to being
shut and the less calm alone can free it (old knots harder than fresh ones; now run as finding 9, by adaptation rather than
the latch). Breath releases in two ways: by lowering drive everywhere
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

## 4. The exam (sealed v1, 26 Sep 2026)

**Sealed** in `observations/spec.yaml` (version 1, 26 Sep 2026; SHA-256 and the sealing commit in `observations/seal.yaml`),
before any sweep. It changes only by a new, dated version; a test fails if the file differs from its seal, and every result
names the version it used. The author asked that the wording rest on judgment, and that the site's introduction, not the
essays, be the record (the essays' text was generated and is sometimes off). So each observation takes the introduction's
words or the author's own (quoted under `words` and checked against `src/data/tour.ts` and `observations/author.md` by a
test), and reports found only in the essays are **set aside**, shown and unscored, until the author confirms them. The
readings of the words ("within seconds" is within 10 s, during the out-breath; "many breaths" is the third to the thirtieth;
and so on) and the scoring rules (pass, fail or silent per part; passes as shares of plausible parameter sets) are sealed
with it.

| ID | Observation (the introduction's words, or the author's) | Evidence |
|---|---|---|
| O1 | Knots answer to the breath: a slow out-breath; one relaxing breath softens many small knots at once, deeper ones go only to focused attention and breath; broad or focused; easy knots in a breath or two, hard ones over many; a learned skill, proprioceptive and meditative | S |
| O2 | Pressure and focused attention (a foam roller, a patient hand) release knots one place at a time; pressed, with a slow out-breath, a knot often lets go within seconds | S |
| O3 | Drinking water seems to ease release, and to speed it | S |
| O4 | Knots worsen under stress, and gather where it is held: neck and shoulders, jaw, belly, low back | S |
| O16 | Some knots come and go with breath and mood; some may be held from moment to moment | S |
| O5 | As knots gather they limit movement; a stretch meets them as dull, deep blocks | S |
| O6 | A knot goes with a small pop, sometimes a star of tingling across a patch of skin | S |
| O8 | When one knot lets go, others move in to fill the gap: the body evens itself out | S |
| O13 | Releasing a parent lets many children go with it (the author, written down after the tree runs were shared) | S |
| O15 | A hierarchy: a few large knots that take many sessions, micro knots at dozens to the square inch | S |
| O9 | Working one side can ease the other (the crossover effect: kelly2016, konrad2023) | M |
| O10 | Knots accumulate with age and grow; a young knot comes and goes, an old one persists | S |
| O7, O11 | Euphoria; peeling and filling: noted, not scored | S |

Changes from the draft: O2 is the introduction's (the draft's "pressure, then release, faster than calm" was the vessel
model's trial, not a report); O2b folds into O2, where the introduction puts attention; O16 is added; O14 (the base of the
skull, warmth from an old cluster) is set aside with the other essay-only reports (the paths and queue at the back of the
skull, distant keys, "pressure alone does not release", fresh knots in a session and old ones in months, the strict order of
knots before peeling).

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

## 5b. The harness and matrix v1 (designed 26 Sep 2026; to build)

`knots_sim/exam.py` loads the sealed spec and refuses to run if the file's hash differs from its seal. For each theory,
each variant and each scored part it runs the part's trial over parameter sets sampled across the theory's own ranges,
and records one of: **a pass share** (the share of plausible sets in which the part holds; never one tuned setting),
**silent** (the theory's account says nothing), or **not run** (it says something, but no trial can test it yet). The
matrix shows each variant's cells and its joint pass, and the best variant per part.

**Parts** (the sealed readings in brackets; each part names the words it tests):

| Part | Trial and pass |
|---|---|
| O1.1 | A held knot, slow breathing: the easiest knots let go during an out-breath [within 10 s of its start] |
| O1.2 | A patch of knots, one relaxing breath (no pressure, no focus): ≥ 3 small knots let go [within the same breath] |
| O1.3 | Deep knots hold through 30 relaxing breaths, but let go to focused attention and breath at their place [within 30 breaths] |
| O1.4 | Both patterns occur under the theory's breath variants: releases spread across regions (broad), and most in one region (focused) |
| O1.5 | Under one way of breathing, some knots go by the end of the 2nd breath and others between the 3rd and the 30th |
| O2.1 | Pressure (and attention) at one place in a patch: knots let go there, few elsewhere |
| O2.2 | A held knot pressed (palpation pressure, not occlusion; a guessed range until measured), slow breathing: ≥ half of knots across depths let go during an out-breath [within 10 s] while still pressed. T1 today lets go when pressure lifts: scored as it is |
| O3 | Hydration eases or speeds release (most theories expected silent) |
| O4.1 | Raised sustained drive: more held knots in a patch |
| O4.2 | Held knots concentrate where drive or load is highest |
| O16.1 | Drive that moves with breath and mood: some knot forms and lets go at least twice in an hour |
| O16.2 | Some knot forms and lets go within a single breath |
| O6 | A release brings, within seconds, a brief sensory signal confined to the released knot's own patch |
| O8 | After one knot lets go, a new knot forms nearby within minutes, and the held count evens out |
| O13 | Releasing one knot lets ≥ 3 others go with it, within seconds |
| O15 | The theory's unit exists at ≥ dozens per square inch and ~10⁵ in a body (anatomical counts, sourced) |
| O5, O9, O10 | Not run until the mechanics and body stages (O10's young-and-old part can run with T1's adaptation); O7, O11 noted |

**Theories in matrix v1.** T1 (variants: the breath through drive, through movement, both; with and without adaptation),
T3 and T6; T2 once the Hai–Murphy rate constants are in hand (§11); T4 and T5 next.

**T6, perception** (the account to beat; hypotheses.ts at its strongest). Sites on a body map, each with a peripheral input
(ordinary tissue signals, raised where muscles guard under stress) and a local gain; a central gain set by threat and
arousal (stress raises it; a relaxing breath lowers it within seconds; safety over minutes); attention as a spotlight on
one site that lowers its local gain when paired with safety; a knot is a site whose felt intensity (input × local × central
gain) crosses a threshold. Overbreathing lowers CO₂ and makes tingling anywhere, over tens of seconds to minutes. Sources to
find on PubMed (quotes verified): descending modulation and conditioned pain modulation timescales, attention's effect on
pain, hyperventilation paraesthesia onset and extent; everything else marked guessed.

**T3, trigger points** (the energy crisis, gerwin2004). One endplate zone: acetylcholine leak drives sarcomere contracture;
contracture compresses the capillaries; ischaemia lowers ATP; low ATP keeps the contracture (the loop); sympathetic drive
raises endplate activity (stress raises trigger-point EMG: McNulty 1994, measured; find it); sensitising substances build
(Shah's microdialysis); release by sustained compression, stretch or needling, with a local twitch. Variants: the standard
unit (hundreds of mapped sites) and a single motor unit (for O15's density). Parameters sourced where possible, the rest
guessed.

**On the site.** Matrix v1 on the Research page: theories and variants by parts, cells shaded by pass share, silent and not
run marked, each cell's why on hover; findings 004 generated from the run.

**Later: the base of the skull.** Set aside in the exam (essay-only), but a sharp location test if the author confirms it:
the vessel view puts a root there (the occipital artery and the greater occipital nerve at the superior nuchal line), the
trigger-point view the suboccipital and upper-trapezius points, the nerve view the occipital nerves, the latch nothing
special, and perception wherever attention and threat gather.

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

**Location first** (reassessed 26 Sep). Before any recording, the cheapest discriminator: each theory puts knots in
different places and numbers (perforator exits; muscle endplate zones; the loose layers; nerve piercing points, the same
places as perforators; anywhere, and inside the head and organs, for perception and the latch). Blinded palpation against a
Doppler map, an endplate map or ultrasound of the layers is step 0 of the decision tree. The essays' size and number report
(O15: micro knots at dozens per square inch) already constrains the unit: only small perforators, small arteries anywhere,
or single motor units are that dense.

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
- **Clusters** (O8, O13): how clusters form, what lets go together, the order of release, the queue, cluster sizes, and where
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
| B Exam | the author's observations, mechanism-neutral; frozen and sealed | *done:* spec v1 sealed 26 Sep 2026 (hash and commit; OSF optional, D7) |
| C Decide | instrument models; signatures; discrimination; the decision tree; sealed predictions; the pilot | a lab-ready protocol with predicted outcomes |
| D Space | the field; existing maps as data; the body; the atlas driven by the model | O8–O10 run; the spatial test reported |
| E Site and paper | the section built out as the work lands; a preprint | preprint submitted, code and results cited by DOI |

**Milestones.**

| | Milestone | Needs |
|---|---|---|
| M1 | Breath routes in the interface; T1 with movement (B2) and the pulse variant; P10–P12; the field, first version; the exam drafted for the author | nothing new |
| M2 | T6 and T3 behind the interface; the harness; matrix v1 with T1, T3, T6 (the exam is sealed) | nothing new |
| M3 | T2 live (Hai–Murphy) with the latch-hardening variant; T4, T5, the gamma loop, hybrids; matrix v2 | the papers (§11) |
| M4 | Instrument models; signatures; the decision tree; sealed predictions | M2 at least |
| M5 | Clusters and migration for every theory (O8, O13, P13); the spatial test with published maps; network; body; the atlas driven by the model | digitised perforator maps |
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
- **Done in M1 (26 Sep):** the movement route in T1 (`k_mv`, `tau_w`, `tau_z` fitted to clifford2006); release maps over
  knot depth for every breath route, and the least movement per breath (`knots_sim/breath.py`); the tree
  (`knots_sim/models/tree.py`) with robustness over 256 trees; the exam drafted as data (`observations/spec.yaml`,
  shown on the site as a draft); the Research page; a movement control on the bench; findings 002.
- **Done after (26 Sep):** the field (240 knots, broad against focused); the findings synthesis on the Research page (what
  the simulations show, and a can / cannot / open verdict per theory); where knots are and how many (the location test,
  O15) as step 0 of the decision tree; Simulation in the top bar; both pages indexed; a sitemap.
- **Exam sealed (26 Sep):** v1 from the introduction and the author's words, with the readings and the scoring rules; the
  essay-only reports set aside (§4). The harness can now be built against it.
- **Done after that (26 Sep):** the measured wall and length–tension width (schiffrin1995, mulvany1979), with every claim
  that rested on the old numbers rewritten from the run; how tightly the lumen closes shown as the guess it is; the switch
  diagram and the bench's stress slider rescaled to the measured band; length adaptation (finding 9, findings 003, the
  Research page's *Time* section, the four-hour closure test as an ask); the perforation's mechanical role (finding 10).
- **Next, from finding 9:** the open vessel's missing loop (activation easing as the muscle adapts, or flow and metabolic
  regulation), fitted to martinezlemus2004's maintained diameter, before adaptation speaks about open vessels (creep, the
  flush's duration, O4); adaptation in the tree (does a set parent leave set children?); the strain gain at a piercing as a
  movement-route variant (finding 10).
- **Still in M1:** the shared interface (`interface.py`) with the other breath routes (local nerve, attention,
  chemistry); the field (a patch of a few hundred vessels under one breath, broad against focused); P12 (old and new
  knots) waits for the latch.
- **Next sessions (no papers needed):** the rest of M1, then M2. Breath routes in `knots_sim/interface.py`; the movement route and the
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

4. Martinez-Lemus LA, Hill MA, Bolz SS, et al. (2004). *Acute mechanoadaptation of vascular smooth muscle cells in response
   to continuous arteriolar vasoconstriction: implications for functional remodeling.* FASEB J 18:708–710.
   https://doi.org/10.1096/fj.03-0634fje (martinezlemus2004). The diameters after 4 h and on removal of the drive, and the
   time course of the cells' repositioning: to measure the adaptation's time constant and fit the open vessel's missing loop.
5. Syyong H, Cheung C, Solomon D, et al. (2008). *Adaptive response of pulmonary arterial smooth muscle to length change.*
   J Appl Physiol 104:1014–1020. https://doi.org/10.1152/japplphysiol.01203.2007 (syyong2008). The time constant of the
   monoexponential force recovery; the adaptation's share is fitted to its abstract, its pace is not yet.
6. Hill MA, Potocnik SJ, Martinez-Lemus LA, et al. (2003). *Delayed arteriolar relaxation after prolonged agonist exposure:
   functional remodeling involving tyrosine phosphorylation.* Am J Physiol Heart Circ Physiol 285:H849–H856.
   https://doi.org/10.1152/ajpheart.00986.2002 (hill2003). How much slower the relaxation is after 4 h: a second target.

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

- **D1** The section's name. *Decided 26 Sep 2026:* two tabs, **Research** (the case for researchers) and **Simulation**
  (the bench).
- **D2** When the section joins the top bar. *Decided 26 Sep 2026:* now, both pages indexed and in the sitemap.
- **D3** Python with generated TypeScript: built, and held to the same trajectories by a golden test.
- **D4** What "attention" means. *Decided 26 Sep 2026 (sealing the exam):* as the introduction puts it, with pressure (O2) and
  in the breath's skill (O1); in the models it remains a breath route (B4), a variant.
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
