# sim — the field guide's engine

Each theory of knots written as a model from its own physiology, with every number sourced or marked guessed, and run through
the same scenes, so that its knots show how they would feel, respond and move. The plan is [PLAN.md](PLAN.md); how the results
reach the site is [../docs/SIMULATION.md](../docs/SIMULATION.md). The rules every change follows are in the root `CLAUDE.md`
(Simulation). The exam phase (scoring theories against reports) is retired: [archive/](archive/).

## Run

```sh
cd sim
uv sync            # Python ≥ 3.11; installs the locked environment into .venv
uv run pytest      # tests
uv run python -m knots_sim.guide    # the field guide: every theory through every scene (about 4 minutes)
uv run python -m knots_sim.export   # the vessel bench's data and the TypeScript models (minutes)
uv run python -m knots_sim.exam     # every theory through the exam: src/data/sim/matrix.json (about half an hour)
```

## Layout

Data that people review, the parameters and (later) the tests, lives outside the package.

```
params/vessel.yaml       T1, the vessel switch: every parameter with its source, locator and quoted line
params/checks.yaml       numbers for the feasibility checks (collar, cooling, latch)
params/tree.yaml         the tree's own numbers (guesses, sampled)
params/adapt.yaml        length adaptation: how fast and how far a held vessel's muscle adapts, with sources
params/interface.yaml    what every theory shares in the trials: stress held, the breath, the hand (guessed or sourced)
params/perception.yaml   T6, perception: gain, arousal, attention, the in-breath, overbreathing
params/triggerpoint.yaml T3, trigger points: the energy crisis at an endplate, pressure release, the twitch
params/motorswitch.yaml  T7, the motor switch: the latch (persistent inward currents) and the metabolic loop, mostly guessed
observations/spec.yaml   the exam: what people report, as tests (versioned; seal.yaml keeps v1-v3's seals)
knots_sim/
  guide/                 the field guide's engine: patch.py (the shared patch, each theory's layout), scenes.py,
                         senses.py (what a finger feels), t1/t3/t6/t7.py (one runner per theory), traits.py (the
                         character, generated), export.py (src/data/sim/guide.json, public/sim/guide/*.json, findings/guide.md)
  pubmed.py              PubMed E-utilities and Europe PMC full texts, paced and cached (.cache/, ignored)
  library.py             papers the simulation stands on, merged into src/data/papers.json from PubMed records
  params.py              loads the tables; --verify checks every quote against its source
  models/vessel.py       the vessel switch, written once in SymPy; calibration and fitting to measured targets
  models/tree.py         a parent and its children, each a switch, sharing pressure; many trees at once
  models/perception.py   T6: places on a body map felt as knots through gain, arousal and attention
  models/triggerpoint.py T3: an endplate's contracture held by its own ischaemia
  models/motorswitch.py  T7: motor units that latch on and are kept on by their own metabolites
  exam.py                the harness: the shared trials and pass criteria, every theory through them, matrix.json
  aimed.py               a breath aimed at one place (route B6, the author's hypothesis): how narrow it must be; aimed.json
  instrument.py          what an instrument would record: the exam's trials read as laser speckle, elastography; instrument.json
  apart.py               the hand or the attention it draws (Q4): each theory's press taken apart; apart.json
  theories/t1.py t3.py t6.py t7.py   each theory's mapping onto the trials, written out for its proponents to check
  scenarios.py           the trials as input scores: a knot forms, holds, lets go
  breath.py              the breath's routes over knot depth: release maps, the least movement per breath
  field.py               a patch of perforators under one breath: broad against focused release
  adapt.py               length adaptation (two timescales): how a held knot sets, and what its release looks like
  robustness.py          Sobol sampling of every uncertain parameter; which ones decide the switch
  checks.py              the collar and cooling checks
  codegen.py             the model's equations as TypeScript (src/sim/models/)
  export.py  findings.py run everything; write src/data/sim/*.json, the findings note and the run manifest
tests/                   physics, calibration, and freshness of what the site shows
findings/                notes written from a run's numbers (001 can a perforator hold, 002 breath and trees, 003 how a knot sets,
                         004 the exam)
exploratory/             quick probes behind the plan's findings, kept as run (not tests)
results/<run>/           run manifests (committed); raw/ is not
private/                 papers for reading (ignored by git: never commit PDFs)
```

Still to come (PLAN.md §9–11): the latch (T2), densification (T4) and the nerve view (T5) behind the same harness; the other
breath routes (local nerve, chemistry); the measurement designed from the models (PLAN.md §11); the open vessel's missing loop for adaptation; the mechanics and body stages (O5, O9, O10.2); the instrument
models.
