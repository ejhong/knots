# sim — the theories against the observations

The research engine for the simulation phase: each theory of knots written as a dynamical model, run through the same trials, and
scored against the same observations. The plan is [PLAN.md](PLAN.md); how the results reach the site is
[../docs/SIMULATION.md](../docs/SIMULATION.md). The rules every change follows are in the root `CLAUDE.md` (Simulation).

## Run

```sh
cd sim
uv sync            # Python ≥ 3.11; installs the locked environment into .venv
uv run pytest      # tests
```

## Layout

Data that people review, the parameters and (later) the tests, lives outside the package.

```
params/vessel.yaml       T1, the vessel switch: every parameter with its source, locator and quoted line
params/checks.yaml       numbers for the feasibility checks (collar, cooling, latch)
knots_sim/
  pubmed.py              PubMed E-utilities and Europe PMC full texts, paced and cached (.cache/, ignored)
  library.py             papers the simulation stands on, merged into src/data/papers.json from PubMed records
  params.py              loads the tables; --verify checks every quote against its source
  models/vessel.py       the vessel switch, written once in SymPy; calibration and fitting to measured targets
  scenarios.py           the trials as input scores: a knot forms, holds, lets go
  robustness.py          Sobol sampling of every uncertain parameter; which ones decide the switch
  checks.py              the collar and cooling checks
  codegen.py             the model's equations as TypeScript (src/sim/models/)
  export.py  findings.py run everything; write src/data/sim/*.json, the findings note and the run manifest
tests/                   physics, calibration, and freshness of what the site shows
findings/                notes written from a run's numbers (001-can-a-perforator-hold.md)
results/<run>/           run manifests (committed); raw/ is not
private/                 papers for reading (ignored by git: never commit PDFs)
```

Still to come (PLAN.md §8): `observations/spec.yaml` (the exam), the other theories' models, the sweep harness.
