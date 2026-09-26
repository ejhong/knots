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

It grows stage by stage (PLAN.md §9). Data that people review — the tests and the parameters — lives outside the package.

```
observations/spec.yaml   the exam: O1–O10 as tests with tolerances, frozen by version
params/<theory>.yaml     parameter tables, every value with its source
knots_sim/
  interface.py           the shared inputs u(t) and outputs y(t)
  trials/                P1–P8, the same inputs for every theory
  models/                one module per theory (t1_perforator, t2_latch, …), equations written once in SymPy
  scoring.py             observations → pass, fail or graded
  sweep.py  analysis/  continuation/
  codegen/               models → TypeScript for the bench, and typeset equations
  export/                results → src/data/sim/*.json for the site
tests/
results/<run-id>/        manifest and summaries (committed); raw/ is not
private/                 papers for reading (ignored by git: never commit PDFs)
```
