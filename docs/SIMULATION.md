# The simulation section — design

*The site's side of the simulation phase. The research plan is `sim/PLAN.md`; the look is `docs/DESIGN.md`. The section
now has two pages. `/research/` (in the top bar as Research, noindex for now) is the case for researchers: the problem,
the observations as a dated draft, the theories, what physics allows, the breath's routes, trees, what each theory
predicts a recording would show, the experiment as a decision tree, and what is needed; its figures are drawn at build
time by `src/sim/figures.ts`. `/simulation/` is the bench. Built so far at `/simulation/` (unlisted, noindex): the switch and the bench for T1 (the vessel switch), the four checks, the
predictions, robustness, the model against measurements, and every parameter with its quote. Still to come, in the order of
`sim/PLAN.md` §9–10: the breath's routes and the field, the exam, the matrix, the fingerprints, and the decision tree for labs.
The name is decision D1 in the plan.*

The atlas shows what each theory says a knot *is*. This section shows what each theory can *do*: every theory put through the
same trials, scored against the same observations, with every number traceable to its source. It adds to the site; nothing
there is replaced.

## Principles

These come on top of `docs/DESIGN.md` and `CLAUDE.md`.

- **Honest by construction.** Every figure says it is a model. Every observation carries its evidence (measured, or self-report).
  The exam shows its frozen version and date before any result, and every result carries its run (date, code version). One line
  says it plainly: *the simulation tests what each theory can produce; it measures nothing.*
- **Fair.** The theories appear in the site's order with their glyphs and short labels (結 閂 点 膠 神経 覚). No theory has a colour
  of its own, and nothing is coloured as good or bad. Variants are shown, not hidden.
- **Traceable.** Tap any number to see its source (the library entry), the quoted line and its confidence. The equations on the
  page are generated from the model that ran.
- **Describe, never prescribe.** *Trials*, not protocols. The bench's controls are the model's inputs, not instructions. No
  technique, no intensity.
- **The colour roles hold.** Terracotta is a held knot and nothing else: the held branch, the held state. Jade is release: the
  released branch, the spark. The indigo seal marks what is frozen and dated. Everything else is ink, stone and paper. Results
  are marked in ink by shape and fill, never red and green.
- **Fast.** The page reads small precomputed JSON. The bench runs a generated model of a few hundred lines. Charts are hand-made
  SVG: no chart library, no web fonts. Equations are native MathML, which renders in system fonts.
- **Paced by the breath.** Animation follows the paced breath the atlas uses (six a minute, `src/viewer/sim/Breath.ts`), and stops under
  `prefers-reduced-motion`.

## Where it lives

- **A page, `/tests/`** (named per D1), in the top bar after Hypotheses (`src/components/TopBar.astro`). Until D2 decides
  otherwise it is unlisted (noindex, not in the top bar), like `lab`.
- **Hypotheses**: each theory's card gains one line, "In the tests", with its row of the matrix and a link to it.
- **Atlas** (Stage 4): the knots driven by the model; the hover card links to the theory's row.

## The page, top to bottom

A reading page (a paper card with a quiet index, like Hypotheses), with two instruments set into it (an ink panel beside a
visualisation card, like the atlas) for the switch and the bench.

### 1. Opening

The title, and one paragraph with the question: which theories can produce what people report, at what cost, and what would tell
them apart. Beneath it, one line of state in mono, for example `exam v1 · sealed 2026-10-… · last run 2026-10-… · a1b2c3d`.

### 2. The switch

The opening image: one knot's bifurcation diagram, alive.

- **Axes.** Sympathetic drive S along the bottom, labelled *calm ← → stressed*; held-ness (or the vessel's flow) up the side.
- **Branches.** The held branch in terracotta and the released branch in jade, both solid; the unstable branch between them a
  dashed ink line; the two folds marked with small open rings; the bistable band a faint wash.
- **The knot.** A dot rides the diagram while the paced breath swings S about its baseline. A stress control moves the baseline.
  When the dot passes the release fold it drops to the jade branch with a small spark: the pop. When stress carries it past the
  upper fold it jumps to the held branch. Below the figure, S, the state and the time since release, in mono.
- **Theories.** Glyph tabs switch between theories. A theory without a switch shows its single curve and a plain sentence, for
  example: *No bistable region at any plausible parameters: a knot here would follow the breath.*
- **Caption**, in Georgia italic: the model, its version, and how many parameters are sourced and how many guessed.
- **Phones:** the figure above, the text below; tap to pause the breath.

### 3. A knot on the bench

The model, running live, laid out like the atlas: an ink panel of controls and readouts beside the card.

- **The drawing.** One perforator in cross-section:
  - the ring in the deep fascia
  - the hyaluronan collar, a pearly band whose density shows its viscosity
  - the artery, in silver-blue, its lumen narrowing as it constricts
  - the veins beside it
  - the nerve, a fine line that flashes jade when it fires
  - a faint lymphatic

  Drawn at true scale where the scale is known; labelled *representative* where it is not.
- **Traces.** Strip charts of the last minute: S, the vessel's radius or flow, local temperature, pH or O₂, collar viscosity,
  nerve firing. Thin ink lines; a terracotta wash behind them while the knot is held.
- **Controls** (bronze, the hand):
  - *breath*: paced by default, or hold to breathe in and let go to breathe out, as in the atlas; and *how the breath acts*,
    a selector over its routes (drive, movement, local nerve, attention, chemistry: `sim/PLAN.md` §2), each a variant. How
    the breath acts is kept open; the page never presents one route as the mechanism
  - *stress*: a slider
  - *press*: hold on the drawing
  - *warmth*: a slider
  - *reset*
- **Parameters.** A drawer listing every parameter with its value, units, source and confidence, plus a variant selector where a
  theory has variants.
- **Theories.** Any implemented theory can go on the bench, with the same controls: that is the shared interface made visible.
- **One honest line:** *This is the model, running. It illustrates a hypothesis; it measures nothing.*

### 4. The exam

The observations as tests, O1–O10; O11–12 shown faint as deferred.

- **Cards.** Each is a small card: the observation in one plain line, the test with its tolerances, an evidence badge (**M**
  measured or **S** self-report, with sources), and notes (for example, *most theories expected to be silent*).
- **Groups:** the breath and the hand (O1–O3), load (O4–O5), the spark (O6), across the body (O8–O10), noted only (O7).
- **The seal.** The indigo seal 結 is stamped *sealed v1*, with the date and the OSF link: the exam was written before any theory
  sat it. Before then it reads *draft*.

### 5. The matrix

The result.

- **Rows and columns.** Rows are the six theories in the site's order (glyph and label), with hybrids below a rule. Columns are
  the observations, with short labels.
- **Marks,** in ink:

  | Mark | Meaning |
  |---|---|
  | filled disc | passes; its area is the share of the theory's plausible parameter range that passes |
  | open ring | passes somewhere, but the share rounds to nothing |
  | faint cross | cannot pass at any plausible parameters |
  | dash | silent: the theory makes no claim |
  | blank | not yet run |

- **Robustness.** A faint halo spans the share's range as the exam's tolerances move within their bounds.
- **The last column** is the joint pass rate.
- **Structural results** sit above the table as plain sentences, for example: *T5 has no switch: nothing holds a knot once the
  stress is gone.*
- **Tapping a cell** opens a drawer:
  - a one-sentence finding
  - a passing run and a failing run, as small traces
  - *what would have to be true*: the passing parameter ranges drawn against the literature's
  - the parameters that decide the result (Sobol indices)
  - the sources
- **Phones:** the table scrolls sideways with the glyph column pinned, like the comparison table on Hypotheses.

### 6. What would settle it

The payoff of the section: what a lab should measure first, and what it would see under each theory.

- **Fingerprints.** For each theory and variant, the predicted recording at a release, as an instrument would record it
  (flow at each depth, skin temperature, stiffness, EMG, sympathetic activity, tissue strain), drawn side by side.
- **The decision tree.** The cheapest measurement that splits the most theories first, then the next; each branch with the
  predicted outcomes and the number of release events needed. The predictions are sealed (OSF, dated) before any data, and
  the tree carries the seal.
- **For labs.** A one-page summary: the protocol, the instruments, the predicted traces, the controls. It describes a
  measurement; it gives no technique to anyone practising.

Small multiples, one per discriminating prediction, with the theories that differ drawn side by side:

- skin temperature over the spot at a release (T1 and T2 predict a local rise; T6 predicts none locally)
- the flicker before a slow release (critical slowing down: switch theories, not smooth ones)
- where the sparks are felt (the released patch, or anywhere)
- where knots cluster (at watershed zones, or anywhere; after the network stage)

Each says what it would take to measure: the instrument, and the resolution in time and space. This describes; it does not
instruct.

### 6b. The field

A patch of skin with a few hundred perforators, each with its own wall drawn from the plausible ranges, under one breath:
easy knots letting go first and hard ones over many breaths or not at all; broad release (drive, everywhere at once) against
focused release (movement, where the breath moves the tissue, or a touch); neighbours changing as one lets go. The same
controls as the bench. It is the bridge from one knot to the atlas.

### 7. How it works

- **Method.** The method in plain words: sampling, scoring, evidence, robustness.
- **Equations.** Each theory's equations, folded per theory and generated from the models.
- **Parameters.** The parameter tables with their sources.
- **The run log.** Each run's date, what changed and why (*T1: collar viscosity range narrowed, from …*), the exam version,
  the cells of the matrix that moved, and the commit. Milestones can also enter the site's timeline (`src/data/timeline.ts`).

## Visual specifics

- **Type.** Headings in sans (15px, 700); prose in Georgia (13.5px on paper); data, axes and labels in SF Mono (9–11px); IDs such
  as O1 and T1 in mono.
- **Lines.** Axes 1px in ink; no gridlines, except faint reference lines at tolerances; direct labels instead of legends.
- **Tokens.** From `src/styles/tokens.css`: `--terracotta` held, `--sage` release on paper, `--jade-light` on ink, `--seal`
  frozen, `--stone` structure, `--muted` secondary. The ink cards use the night palette, as the atlas does (terracotta `#e27b61`,
  spark `#a8e6cd`). A new colour goes into `tokens.css` and `engine/theme.ts` together.
- **Numbers.** Always with units (s, mm, °C, kPa, Pa·s); two significant figures unless the source gives more; ranges written
  0.8–2.4.
- **Accessibility.**
  - Every figure has a text summary.
  - The matrix is a real table, with text in every cell (visually hidden where a mark shows), and marks differ by shape as well
    as fill.
  - Cells and controls are keyboard-reachable and labelled.
  - Reduced motion shows the diagram still, with the dot at the baseline.

## Data contracts: sim → site

All written by `sim/knots_sim/export`, never by hand. Each file carries the run id it came from.

| File | Contents |
|---|---|
| `src/data/sim/manifest.json` | run id, date, commit, exam version, package versions |
| `src/data/sim/exam.json` | O1–O12: id, title, test, tolerances, evidence, sources, notes; version, date sealed, OSF link |
| `src/data/sim/theories.json` | per theory and variant: id (as in `hypotheses.ts`), variant, equations (MathML), parameters with provenance |
| `src/data/sim/switch/<theory>.json` | bifurcation branches (S, state, stability), folds, loop width |
| `src/data/sim/matrix.json` | per theory × observation: status (pass, cannot, silent, unrun), share, share range across tolerances; joint rate |
| `src/data/sim/runs/<theory>-<trial>.json` | representative trajectories, downsampled: passing and failing |
| `src/data/sim/requirements/<theory>.json` | passing parameter ranges against literature ranges; Sobol indices |
| `src/data/sim/log.json` | the run log |
| `src/sim/models/<theory>.ts` | the generated model for the bench: right-hand side, Jacobian, defaults |

## How it fits together

```
sim/observations/spec.yaml ─┐
sim/params/*.yaml ──────────┤
sim/knots_sim/models ───────┼─► trials · sweeps · continuation · scoring ─► sim/results/<run>/ ─► export ─► src/data/sim/*.json ─┐
   (SymPy, written once)    │                                                                                                   ├─► Astro pages
                            └─► codegen ─► src/sim/models/*.ts (the bench) + MathML equations ─────────────────────────────────┘
```

- The bench integrates the generated model with a small Rosenbrock (linearly implicit) stepper, using the generated Jacobian, at
  the frame rate. It runs on the main thread unless profiling says otherwise.
- Golden-trajectory tests (vitest) check that the TypeScript model reproduces the Python reference runs within tolerance.
- The Pages build reads the JSON and runs nothing.

## Build order

1. The unlisted page, and the switch from T1 (Stage 1).
2. The bench (Stage 1).
3. The exam: as soon as it is drafted, marked *draft* until it is sealed.
4. The matrix and *What would settle it* (Stage 2).
5. The top-bar link and the Hypotheses cross-links, when D2 says so.
6. The atlas driven by the model (Stage 4).

Screenshot every visual change with `scripts/shot.ts` at desktop and phone widths.
