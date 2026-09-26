# Simulation plan: the theories against the observations

*Status (26 Sep 2026): Stage 0 is done, and Stage 1 is under way. The first model, T1 as **the vessel switch**, is built
from sourced parameters, validated against measurements, checked for robustness, and live on the site at `/simulation/`
(unlisted); four feasibility checks are answered (findings/001-can-a-perforator-hold.md). Written from the author's
planning brief ([BRIEF.md](BRIEF.md), verbatim) and reassessed against this repo; where the two differ, this plan holds.
A number marked (verify) has no source yet: source it before using it.*

## 0. Findings so far

1. **The vessel can hold itself.** A small artery with tone in its wall has two stable states over a band of tone
   (Burton 1951): with measured numbers the band is 0.21–0.40 of maximal tone, just above rest (0.17). An open vessel
   snaps shut above the fold and a shut one stays shut until tone falls below the reopening threshold: *held until
   released*, from mechanics alone. A switch in 72% of 49,152 plausible parameter sets; whether a knot can hold at rest
   is decided mostly by the width of the muscle's length–tension curve and the wall's thickness (both guesses today,
   both measurable in a myograph).
2. **Hyaluronan cannot hold it.** A liquid resists motion, not position; even at synovial-fluid viscosity its drag is
   about 12 times too weak. T1's collar is not the hold; if it matters, it is as something stiffer, or as friction.
3. **Cooling cannot release it within a breath** (warming takes ≥ 44 s even at maximal skin flow).
4. **The latch economises; it does not remember** (relaxation follows calcium; Rembold 1991).
5. **Predictions**: a local flush at release (laser speckle); pressure-then-release faster and brighter than calm;
   slowing near the fold; breath releases knots only if its effect on drive is uneven. O1 (release within 2–10 s of one
   exhale) is reproduced only for knots poised at the threshold; O2 (pressure, then release) is reproduced well.

Next: source the guessed wall parameters; the Hai–Murphy rate constants (the 1988 paper is not open; put the PDF in
`sim/private/`) to run T2 live; hairy-skin reflex magnitudes; then T3–T6 and the exam.

## 1. Aim

**Which theories of knots can produce which reported observations with physiologically plausible parameters, at what parameter
cost, and which measurements would tell the survivors apart?** Not which theory is true: a simulation can rule a theory out or
weaken it; it cannot prove one.

Two outputs from one pipeline:

- **The site**: a new section beside Hypotheses (design: `docs/SIMULATION.md`), regenerated whenever the models or the evidence
  change.
- **A paper**: a bioRxiv preprint, then a journal such as *Journal of Theoretical Biology* or *Frontiers in Physiology*.

Strongly recommended: a physiologist or modeller as co-author, and a small pilot measurement (thermal camera or laser speckle
imaging during a release). Both are the author's decisions (§11); any measurement with people follows the site's moderation
guidance.

## 2. Starting point

- **The theories** are the six in `src/data/hypotheses.ts`, each already written in its strongest form with its own evidence and
  sharpest test. The models formalise those texts. Where a model needs something the text does not say, that is a *variant*, and
  it is labelled as one.
- **The evidence.** `src/data/papers.json` already holds the brief's references (§6). Missing: blood-flow autoregulation models
  (e.g. Carlson, Arciero & Secomb 2008, verify) and nearly every source the parameter tables will need.
- **The atlas simulation** (`src/viewer/sim/KnotSim.ts`) is an illustration: unitless 0–1 states, a held/released switch set by
  hand-chosen thresholds, and an age curve drawn by hand (`heldFraction`: none in infancy, about a fifth at 35, two-thirds by the
  late fifties, approaching nine in ten; its own comment says "a prediction: no census has been taken"). It stays as the atlas's
  illustration until a model can drive it (Stage 4). Its numbers are neither evidence nor targets.
- **Scope now: knots only.** The fascia's observations (peeling, filling) come in a later phase.

### The perforator theory, briefly

A knot, on this view, is a *perforator held stuck*: a neurovascular bundle (a small artery and its veins, a cutaneous nerve, a
lymphatic) rising through a ring in the fascia.

- **The artery is the smooth muscle.** A deep inspiration constricts the skin's arterioles within seconds (bolton1936; "about
  2 s", verify); a slow exhale lets them open.
- **The nerve is the spark.** A constricted vessel starves its nerve; when flow returns the nerve fires, like a foot waking.
- **The hyaluronan (HA) collar is the hold.** HA around the bundle gels when the tissue is cool, acidic and hypoxic, and thins
  with warmth, flow and movement (stecco2011).

Perforators belong to vascular trees: about 40 source-artery territories and on average 374 major perforators (≥ 0.5 mm) per
body (taylor1987), each perforator supplying its own territory (saintcyr2009). The site draws about 100,000 small vessels rising
to the skin 4–5 mm apart (representative; source it). A dilation started on an arteriole conducts upstream along its wall
(segal1986; the site says millimetres to centimetres a second, verify): the proposed basis for knots "migrating".

## 3. The central question: what holds a knot?

"Held until released", "persists for years" and "lets go suddenly, with a pop" describe a **switch**: two stable states with
hysteresis. If constriction simply tracked sympathetic drive, knots would fade in and out with every breath. **Every theory must
name its switch, or be shown to lack one.**

| Theory | Candidate switch |
|---|---|
| T1 Perforator | *As built:* the vessel's own mechanics (Burton's instability: tension that depends on muscle length, against Laplace's law). *As briefed:* constriction → low flow → cooling, acidosis, hypoxia → the HA collar gels → it resists or compresses the vessel; the collar check rules this out as the hold |
| T2 Latch | the latch-bridge state, holding tone at little energy cost (hai1988, the four-state cross-bridge model) |
| T3 Trigger point | the energy crisis: contracture → ischaemia → too little ATP to relax |
| T4 Densification | HA rheology, if it has hysteresis |
| T5 Nerve | possibly none |
| T6 Perception | a central gain loop |

- **Release is fast.** It takes seconds; collagen, scar and adhesions remodel over days to weeks. Release must run through a fast
  state variable, not structural change. Formation may be slow while release is fast; that asymmetry is itself a constraint on
  each model's structure.
- **The first deliverable for each theory** is its bifurcation diagram in sympathetic drive S: is there a bistable region, where
  are its folds, how wide is the loop?
- **Consequences to show, not assume:**
  - *A knot outlasts the stress that made it.* With hysteresis, it forms at a higher S than it takes to keep it.
  - *Critical slowing down.* A switch driven slowly toward its fold (breath after slow breath, not a sudden press) recovers from
    small disturbances more and more slowly before it flips: local perfusion should flicker slower and wider in the breaths
    before a release. This separates switch theories from smooth ones.
- **Structural results first.** Some conclusions need no sweep: a theory with no switch cannot give "held until released" at any
  parameter values, and one whose only hold is structural cannot release in seconds. These are the strongest claims available;
  report them before the statistics.

## 4. The observations: the exam (draft)

The tolerances are drafts. The author reviews them; then they are **frozen** (`observations/spec.yaml` with a version and a
date, committed and preregistered on OSF) before any sweep runs. After that they change only by a new, dated version, and every
result names the version it used. Evidence: **M**, measured in the literature; **S**, self-report. Measured constraints weigh
more.

| ID | Observation | Draft test | Evidence | Notes |
|---|---|---|---|---|
| O1 | Breath release | A held unit flips to released within about 2–10 s of one slow exhale (a sympathetic drop of X%, X from the literature). One relaxing breath can release many small, marginal units at once, but not large, deep ones. | S (the breath-linked constriction itself: M, bolton1936) | The size dependence is part of the test. |
| O2 | Pressure and attention | Sustained local pressure (tens of seconds), then release, flips the unit. Candidate mechanism: occlusion, then reactive hyperaemia. | S (reactive hyperaemia: M) | "Attention" needs a definition (D4). |
| O3 | Water | Hydration lowers the release threshold or speeds release. | S | A weak mechanism: expect most theories to be silent, and report silence as silence, not failure. |
| O4 | Stress | Sustained higher S increases the number of held units, concentrated where baseline tone is higher (neck and shoulders, jaw, belly, low back). | S | |
| O5 | Stiffness | Held units reduce range of motion; a stretch meets them as a dull block. | S | Partial; mostly the fascia phase. |
| O6 | Sparks | Release produces a brief burst of afferent firing (tingling) over the unit's own patch of skin. | S (post-ischaemic paraesthesia: M) | Must be spatial: overbreathing makes tingling anywhere (T6's account), so only tingling confined to the released patch discriminates. |
| O7 | Euphoria | Out of scope for tissue-level models; noted only. | S | |
| O8 | Migration | Releasing one unit changes its neighbours: some flip to held, and the territory evens out. | S | Network stage. |
| O9 | Mirroring | Releasing units on one side increases release or range of motion on the other. | M (kelly2016, konrad2023) | konrad2023 is a scoping review and puts the effect down most likely to reduced pain perception; take the effect size and its duration (kelly2016: up to 10 min) from the studies themselves. Body stage. |
| O10 | Age | The held fraction grows with age as resting S rises and vessel reactivity falls; young knots small and transient, old ones large and persistent. | S (age changes in sympathetic tone and reactivity: M, verify) | The atlas's age curve is illustrative, not data. |
| O11–12 | Peeling, filling | Deferred to the fascia phase. | S | |

**Fair across scales.** A central theory has no "unit" in the tissue. Each test is stated as something that can be felt or
measured, and each theory maps its own states onto those observables: once, in the interface, reviewed for fairness.

## 5. The shared interface

Every theory takes the same inputs and gives the same outputs, or the comparison is not fair.

**Inputs u(t)**

- **S(t)**, sympathetic drive: a baseline stress level plus respiratory modulation (an inspiration raises it within seconds; a
  slow exhale lowers it). Shape and size from bolton1936 and later sources.
- **P(t)**, local pressure.
- **Skin temperature**, **hydration H**, **age A**.
- **Attention**: not yet defined. Pressure plus a lower S; descending modulation for the central theory; or both (D4). Decide
  and document it.

**Outputs y(t)**

- Held or released (or a continuous held-ness); a proxy for palpable hardness; a proxy for tenderness.
- Local perfusion and skin temperature, for the discriminating predictions.
- Afferent firing (sparks) and its spatial extent.
- At network scale: the neighbours' states, and the effect on the other side.

**Trials** are the brief's "protocol battery"; on the site they are *trials* (describe, never prescribe). Identical for every
theory:

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
| P9 | *Added:* a slow approach to release, S lowered breath by breath, to look for critical slowing down |

## 6. The theories

| ID | Site id | Core state variables | Candidate switch | Starting references |
|---|---|---|---|---|
| T1 | `perforator` 結 | vessel radius or smooth-muscle activation, flow, local temperature, pH, O₂, HA viscosity, collar stress, nerve excitability | the flow–metabolite–HA–collar loop | bolton1936, stecco2011, taylor1987, segal1986; autoregulation models such as Carlson, Arciero & Secomb 2008 (verify; not yet in the library) |
| T2 | `latch` 閂 | Hai–Murphy cross-bridge states, Ca²⁺, MLCK/MLCP balance | the latch-bridge state | johnson2023 (an essay, not a paper), hai1988 |
| T3 | `trigger-point` 点 | endplate ACh leak, sarcomere contracture, local ischaemia, ATP, sensitising substances | the energy-crisis loop | gerwin2004, shah2005, sikdar2009 |
| T4 | `densification` 膠 | HA viscosity as a function of pH, temperature and shear; layer glide | HA rheology, if hysteretic | stecco2011, stecco2014, langevin2011 |
| T5 | `nerve` 神経 | a sensitised nerve where it pierces the fascia; ectopic firing | possibly none | quintner1994, quintner2015 |
| T6 | `central` 覚 | dorsal-horn gain, descending modulation, wind-up; attention; CO₂ and overbreathing | a central gain loop | woolf2011; overbreathing and paraesthesia (source needed) |
| H | — | e.g. T1 plus a global loop: held units → nociceptive afferents → higher S everywhere | local switches plus a global loop | — |

- T1 and T4 both use HA; T1 differs by coupling the collar to a vessel and its flow.
- T6 is the site's **Perception** theory, broader than central sensitisation: attention, sleep, and overbreathing (which makes
  tingling anywhere) are part of it. Model that version, not the narrower one.
- **Fairness, made operational.** Each theory is modelled in its strongest form, as the site states it. Where turning words into
  equations is a choice, build at least two variants and report all of them; no theory is judged on one variant. Publish the
  variants with the results, and invite proponents to challenge them (issues and pull requests).
- A plausible, publishable outcome: no single theory passes everything, but a hybrid does. T6 may explain mirroring well and
  local release poorly; T1 the reverse.

## 7. Method

1. **Parameter tables** (`params/<theory>.yaml`). Each parameter has a name, symbol, units, value or range, source (a
   `papers.json` id), locator (page, table or figure), the quoted sentence or cell, a confidence (measured, inferred or guessed)
   and notes. Never a number from memory. Unmeasured parameters (the perforator's HA-collar mechanics, for one) get wide priors
   and a flag.
2. **Sample** 10⁴–10⁵ parameter sets per theory (Sobol or Latin hypercube; SALib).
3. **Run the trials** and score each observation: pass, fail or graded; *silent* where a theory makes no claim.
4. **Report, for each theory and observation:**
   - *existence*: does any plausible parameter set pass?
   - *evidence*: the fraction of the prior parameter volume that passes, and the joint pass rate across all the tests. This
     fraction is the model evidence under approximate Bayesian computation, and it already penalises flexibility: a theory that
     passes only when many parameters are tuned passes in a small share of its prior. So no second complexity penalty is added;
     the ratio between two theories is a Bayes factor under shared tolerances.
   - *prior sensitivity*: the evidence depends on the prior ranges, so show how it moves when they move.
5. **What would have to be true.** The passing region of each theory's parameters, set beside the literature ranges. A theory that
   passes only with an unmeasured parameter in a narrow range has made a prediction: measure that parameter.
6. **Robustness to the exam.** Vary each tolerance across its stated bounds and show how the matrix changes. Headline only what
   holds.
7. **Sensitivity analysis** (Sobol indices): which parameters decide each pass.
8. **Bifurcation and continuation** for every switch (§3).
9. **Discriminating predictions.** For each pair of surviving theories, the trial and the measurable output with the largest
   predicted difference. Candidates so far:
   - A local jump in perfusion or skin temperature at release: T1 and T2 predict one; T6 predicts none locally. (Thermal camera,
     laser Doppler or laser speckle imaging; alvarezprats2019 already finds perforating vessels by infrared thermography.)
   - Critical slowing down before a slow-driven release: switch theories yes, smooth ones no.
   - Sparks confined to the released patch (local theories), or anywhere and following CO₂ (T6).
   - Knots clustered in the watershed zones between angiosomes, where perfusion is most marginal (T1). This needs digitised
     angiosome maps: the atlas's territories are generated (shortest paths from ~40 roots), not measured, so testing against
     them would be circular.

## 8. Stages

| Stage | What | Done when |
|---|---|---|
| 0 Foundations | This plan, the site design, the package scaffold, CI | Done, 26 Sep 2026 |
| 1 One knot, two theories | T1 (ODEs, about 5–8 state variables) and T2 (Hai–Murphy); bifurcation in S; trials P1–P3 and P9; the write-once pipeline; the switch and the bench on an unlisted page | Both bifurcation diagrams exist with sourced parameters; the key question is answered (can release happen within seconds for plausible parameters?); the bench reproduces the Python trajectories; the author has seen the page. **T1 done** (5 states; switch, trials, robustness, page); T2 waits for its rate constants |
| 2 All six, one knot | T3–T6 behind the interface; the harness (sweep, scoring, matrix) | The exam is frozen *first*; matrix v1 with existence, evidence and robustness |
| 3 Network | A synthetic vascular tree (e.g. constrained constructive optimisation), Poiseuille flow (one sparse linear solve per step), conducted dilation; a few hundred to 1,000 units | O8 tested; watershed clustering tested against digitised maps |
| 4 Body (optional) | About 100,000 units from angiosome anatomy; bilateral segmental sympathetic outflow; ageing | O9 and O10 tested; the atlas driven by the model (labelled as such) in place of KnotSim's illustration |
| 5 Paper | A preprint, with code and results cited by DOI | Submitted |

Compute is cheap. The pace is set by sourced parameters, fair formalisations and the author's reviews.

## 9. Engineering

- **Python ≥ 3.11 with uv** (`sim/pyproject.toml`, `sim/uv.lock`): numpy, scipy (`solve_ivp`; the stiff methods Radau, BDF,
  LSODA), sympy, SALib, pyyaml. Numba or JAX later, if sweeps need them. Continuation with PyDSTool or AUTO-07p, or a small
  pseudo-arclength continuation checked against normal forms.
- **Write each model once.** A model's right-hand side is defined once, in SymPy. From it come the numpy functions and Jacobian
  (`lambdify`) for sweeps and continuation, a TypeScript module for the bench (`src/sim/models/*.ts`, generated, with a
  do-not-edit header), and the equations typeset for the site. Golden-trajectory tests: Python writes reference runs, and vitest
  checks that the TypeScript model reproduces them within tolerance.
- **Results.** Every run writes `results/<run-id>/manifest.json`: git commit and dirty flag, exam version, parameter-table hashes,
  seeds, package versions, date. Summaries are exported to `src/data/sim/*.json`, small and committed; the site reads only these.
  Raw outputs stay out of git (attach them to a GitHub release if they need keeping). One command regenerates everything.
- **The Pages build runs no simulation.** It reads the exported JSON, as it reads the precomputed perforator ladder.
- **Citable versions.** A Zenodo DOI for each GitHub release; an OSF preregistration for each frozen version of the exam. Both
  need the author's accounts.
- **CI.** `.github/workflows/ci.yml` runs the sim tests on every push, and the site checks on branches other than `main`
  (`deploy.yml` checks `main`).

## 10. First tasks

0. Take the author through the open decisions (§11); record the answers here and in `docs/ROADMAP.md`.
1. Draft `observations/spec.yaml` from §4 (tests, tolerances, evidence, sources) and review it with the author. Freeze it only on
   the author's word.
2. `knots_sim/interface.py` and the trials P1–P9.
3. Parameter tables for T1 and T2 from primary literature (§13), with the unknowns marked.
4. T1, one knot: the bifurcation diagram in S, then its timescales against O1.
5. T2 (Hai–Murphy): the same.
6. The write-once pipeline, and the bench prototype on an unlisted page (`docs/SIMULATION.md`).
7. The harness: sweep, scoring, the matrix figure.

## 11. Open decisions (for the author)

- **D1** The section's name: *Tests*, *Trials* or *Simulations*? (The first page is at `/simulation/`, unlisted.)
- **D2** Build in the open (the frozen exam first, results as they come) or unlisted until the first matrix?
- **D3** Python with generated TypeScript: built, and held to the same trajectories by a golden test.
- **D4** What "attention" means in the models.
- **D5** A pilot measurement with people (thermal or laser speckle imaging at a release): whether, how, and under the moderation
  guidance.
- **D6** A co-author (physiologist or modeller), and inviting proponents to review their theory's formalisation.
- **D7** OSF and Zenodo accounts.

## 12. Caveats to carry into the paper

- Most observations are self-report. Label them, and weight measured constraints more heavily.
- Consistency is not truth. Conclusions take the form "can or cannot, and at what parameter cost".
- The theories differ in scale (tissue, spinal cord); the interface must be fair to each.
- Turning a theory into equations is a choice. Report the variants; invite the proponents.
- Nothing here is medical advice, and the site's moderation caution applies to any pilot measurement involving people.

## 13. Working notes

- **References** go into `src/data/papers.json` only from PubMed E-utilities output (CLAUDE.md). Full texts: PMC or Europe PMC
  where open; paywalled papers the author supplies go in `sim/private/`, which git ignores.
- **Cloud sessions** (claude.ai/code) block the literature hosts under the default network policy. Allow
  `eutils.ncbi.nlm.nih.gov`, `www.ncbi.nlm.nih.gov`, `www.ebi.ac.uk`, `api.crossref.org`, `doi.org`, `api.openalex.org`,
  `api.biorxiv.org` and `api.semanticscholar.org` in the environment's network settings. A session-start hook
  (`.claude/hooks/session-start.sh`) installs the npm and Python dependencies there. A local machine needs neither.
