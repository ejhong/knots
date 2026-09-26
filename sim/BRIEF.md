> The planning brief from the author's claude.ai chat (26 Sep 2026), kept verbatim. It is the input to [PLAN.md](PLAN.md), which
> reassesses it against this repo and supersedes it where the two differ.

# Knots simulation: handoff brief

*Transferred from a claude.ai planning chat (Sep 26, 2026). Read in full before starting. Nothing below has been implemented yet. Specific numbers came from the chat and from the site; verify every one against primary sources before using it.*

## 1. Background

Site: https://ejhong.github.io/knots ("Knots of Existence"). It proposes that a knot, a small tender held spot that often releases with pressure and a slow exhale, is a **perforator held stuck**. A perforator is a neurovascular bundle (small artery and veins, cutaneous nerve, lymphatic) passing through a ring in the fascia. In the theory:

- **The artery is the smooth muscle.** Deep inspiration constricts skin arterioles within about 2 s (Bolton 1936), and a slow exhale lets them open.
- **The nerve is the spark.** A constricted vessel starves its nerve, and when flow returns the nerve fires, like a foot waking up.
- **The hyaluronan (HA) collar is the hold.** HA around the bundle gels when tissue is cool, acidic and hypoxic, and thins with warmth, flow and movement (Stecco 2011).

Perforators belong to vascular trees (angiosomes). Taylor 1987 counts about 40 source arteries and about 374 major perforators of at least 0.5 mm, and on the order of 100,000 small vessels rise to the skin at 4 to 5 mm spacing. Small arteries conduct dilation upstream (Segal 1986; the site says mm to cm per second, verify). This is the proposed basis for knots "migrating".

**Scope now:** knots only. Fascia observations (peeling, filling) are deferred to a later phase. The site's age-curve numbers (a fifth held in the thirties, and so on) are illustrative, not data.

## 2. Goal

A computational paper comparing mechanistic theories of knots against the reported observations. The framing is **which theories can produce which observations with physiologically plausible parameters, and which measurements would tell them apart**, not "which theory is true". Simulation can rule out or weaken a theory; it cannot prove one.

Target: a bioRxiv preprint, then a journal such as *Journal of Theoretical Biology* or *Frontiers in Physiology*. Strongly recommended: a physiologist or modeler co-author, and a small pilot measurement (thermal camera or laser speckle imaging during self-release).

## 3. Key insight: bistability

"Held until released", "persists for years" and "lets go suddenly with a pop" imply each knot is a switch with two stable states and hysteresis. If constriction simply tracked sympathetic drive, knots would fade in and out smoothly with every breath. **Every theory must name its source of bistability, or be shown to lack one.**

- **Perforator (T1) candidate loop:** constriction → low flow → local cooling, acidosis, hypoxia → HA viscosity rises (gel) → collar resists or compresses the vessel → less flow.
- **Latch (T2) candidate:** the smooth-muscle latch-bridge state, which holds tone at low energy cost (Hai & Murphy 1988 four-state crossbridge model).

The first deliverable for any theory is a bifurcation diagram in sympathetic drive S, showing whether a bistable region and a hysteresis loop exist.

A hard constraint for all theories: release happens in seconds, and collagen, scar and adhesion remodel over days to weeks. So release must run through a fast state variable, not structural change.

## 4. Observations as numbered tests

Tolerances below are **drafts**. Finalize and freeze them (commit with timestamp, ideally an OSF preregistration) before running any sweeps, so they can't be tuned after the fact. Evidence: **M** = measured in literature, **S** = self-report.

| ID | Observation | Draft operational test | Evidence |
|---|---|---|---|
| O1 | Breath release | A held unit flips to released within roughly 2 to 10 s of one slow exhale (sympathetic drop of X%, set X from literature). One relaxing breath can release many small, marginal units at once but not large, deep ones. | S (breath-linked skin vasoconstriction itself: M, Bolton 1936) |
| O2 | Pressure and attention | Sustained local pressure (tens of seconds), then release, flips the unit. Candidate mechanism: occlusion then reactive hyperemia. | S (reactive hyperemia itself: M) |
| O3 | Water | Hydration lowers the release threshold or speeds release. | S; weak mechanism, expect most theories to be silent, and report that |
| O4 | Stress | Sustained higher S increases the number of held units, concentrated where baseline tone is higher (neck and shoulders, jaw, belly, low back). | S |
| O5 | Stiffness | Held units reduce range of motion; a stretch meets them as a dull block. | S; partial, mostly the fascia phase |
| O6 | Sparks | Release produces a transient burst of afferent firing (tingling) over the unit's skin patch. | S (post-ischemic paresthesia: M) |
| O7 | Euphoria | Out of scope for tissue-level models. Note only. | S |
| O8 | Migration | Releasing one unit changes neighbors' states: some flip to held, and the territory "evens out". | S |
| O9 | Mirroring | Releasing units on one side increases release or range of motion on the other side. Take effect size from Konrad 2023. | M (foam-rolling crossover: Kelly 2016, Konrad 2023) |
| O10 | Age | Fraction of held units grows with age as resting S rises and vessel reactivity falls. Young knots are small and transient; old ones large and persistent. | S (age changes in sympathetic tone and reactivity: M, verify) |
| O11 to O12 | Peeling, filling | Deferred to the fascia phase. | S |

## 5. Shared interface

Every theory implements the same inputs and outputs, or the comparison isn't fair.

**Inputs u(t):** sympathetic drive S(t) with respiratory modulation (inspiration raises it, slow exhale lowers it) on top of a baseline stress level; local pressure P(t); skin temperature; hydration H; age A. "Attention" still needs a definition: pressure plus lowered S, or descending modulation for the central theory. Decide and document it.

**Outputs y(t):** held/released state (or a continuous "held-ness"), palpable hardness proxy, tenderness proxy, local perfusion and skin temperature (for discriminating predictions), afferent firing rate (sparks), and at network scale, neighbor states and the contralateral effect.

**Protocol battery, identical for all theories:**

- P1: slow-breathing trial
- P2: single deep breath and slow exhale
- P3: sustained pressure, then release
- P4: chronic stress ramp
- P5: aging sweep
- P6: release one unit in a network, watch neighbors
- P7: unilateral treatment, watch the other side
- P8: hydration change

## 6. Theories to implement

| ID | Theory | Core state variables | Bistability source | Starting references (verify) |
|---|---|---|---|---|
| T1 | Perforator (vessel plus HA collar) | vessel radius or smooth-muscle activation, flow, local T, pH, O2, HA viscosity, collar stress, nerve excitability | flow, metabolite, HA and collar loop | Bolton 1936; Stecco 2011; Taylor 1987; autoregulation models such as Carlson, Arciero & Secomb 2008 |
| T2 | Vascular latch (Johnson's vasocomputation) | Hai-Murphy crossbridge states, Ca2+, MLCK/MLCP balance | latch-bridge state | Johnson 2023; Hai & Murphy 1988 |
| T3 | Trigger point (integrated hypothesis) | endplate ACh leak, sarcomere contracture, local ischemia, ATP (energy crisis), sensitizing substances | energy-crisis loop | Simons' integrated hypothesis as expanded in Gerwin 2004 |
| T4 | Fascial densification | HA viscosity as a function of pH, temperature and shear; layer glide | HA rheology, if it has hysteresis | Stecco 2011; Langevin 2011 |
| T5 | Peripheral nerve | sensitized nerve where it pierces the fascia; ectopic firing | possibly none | Quintner 1994 |
| T6 | Central sensitization | dorsal-horn gain, descending modulation, wind-up | central gain loop | Woolf 2011 |
| H | Hybrids | e.g. T1 plus a global loop: held units → nociceptive afferents → higher S everywhere | local switches plus global loop | — |

T1 and T4 both use HA. T1 differs by coupling the HA collar to a vessel and its flow.

A plausible, publishable outcome is that no single theory passes everything but a hybrid does. For example, T6 may explain mirroring well and local release poorly, while T1 does the opposite.

## 7. Method

1. **Parameter table per theory.** Every parameter gets a literature range, a source, and a confidence level (measured, inferred, or guessed). Store as `params/*.yaml` with citations. Don't invent values. Unmeasured parameters, such as perforator HA collar mechanics, get wide priors and are flagged.
2. **Sample** 10^4 to 10^5 parameter sets per theory (Sobol or Latin hypercube, e.g. SALib).
3. **Run the protocol battery** and score each observation test as pass/fail or graded.
4. **Report a theory × observation matrix of plausibility volumes**: the fraction of prior parameter volume that passes each test, plus the joint pass rate.
5. **Sensitivity analysis** (Sobol indices): which parameters decide each pass.
6. **Complexity penalty**: parameter counts and/or approximate Bayesian computation, so flexible theories can't win by having more knobs.
7. **Bifurcation and continuation analysis** for bistability.
8. **Discriminating predictions**: for each pair of surviving theories, find the protocol and measurable output with the largest predicted difference.

Candidate predictions already identified:

- T1 and T2 predict a local perfusion or temperature jump at release, visible with a thermal camera or laser Doppler/speckle imaging. T6 predicts none locally.
- T1 predicts knots cluster in watershed zones between angiosomes (choke-vessel regions), where perfusion is most marginal.

## 8. Staged build

1. **Single unit (days to 2 weeks).** T1 as an ODE model with about 5 to 8 state variables. Bifurcation in S. Run P1 to P3. Key question: can release happen within seconds for plausible parameters? Optional: an interactive page on the site where you drag breath, stress and pressure and watch a unit flip.
2. **All theories, single unit.** T2 to T6 behind the shared interface. Battery plus sweeps. First version of the matrix.
3. **Network (weeks).** Synthetic vascular tree (e.g. constrained constructive optimization) with Poiseuille flow (one sparse linear solve per step) and conducted dilation. A few hundred to 1,000 units. Test O8 migration and watershed clustering.
4. **Body scale (months, optional).** About 100,000 units from angiosome anatomy. Bilateral segmental sympathetic outflow for O9; age curves for O10. Compute is cheap; the effort is anatomy data.

## 9. Tech suggestions (adjust as you see fit)

Python with numpy and scipy (`solve_ivp`, stiff solvers), numba or JAX for vectorized sweeps, SALib for sampling and sensitivity, `scipy.sparse` for network flow, and a continuation tool (AUTO-07p or PyDSTool; BifurcationKit.jl if switching to Julia). Fixed seeds, configs in YAML, versioned results.

Suggested layout:

```
sim/
  PLAN.md            # this file
  interface.py       # input/output schema
  models/            # t1_perforator.py, t2_latch.py, ...
  protocols/         # the battery
  observations/      # tests and frozen tolerances
  params/            # yaml with citations
  sweeps/  analysis/  figures/
paper/
```

## 10. First tasks

1. Write `observations/spec.md`: finalize O1 to O10 tests and tolerances with evidence type. **Ask the author to review before freezing.**
2. Write `interface.py` and the protocol battery.
3. Build parameter tables for T1 and T2 from primary literature, marking unknowns.
4. Implement T1 single unit: bifurcation diagram in S, then check timescales against O1.
5. Implement T2 with the Hai-Murphy model; same analysis.
6. Build the harness: sweep, scoring, matrix figure.

## 11. Caveats to carry into the paper

- Most observations are self-report. Label them, and weight measured constraints more heavily.
- Consistency is not truth. Conclusions are of the form "can or cannot, and at what parameter cost".
- Theories differ in scale (tissue vs spinal cord), so the shared interface must be fair to each.
- Nothing here is medical advice, and the site's moderation caution applies to any pilot measurement involving people.
