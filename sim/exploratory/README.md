# Exploratory runs

Quick probes behind findings in `../PLAN.md` §1, kept exactly as they were run so their numbers can be reproduced. They are
not tests and not results: the tree resistances and the breath's local effects in them are guesses. Milestones M1 and M5 turn
them into trials with tests (`knots_sim/`, `tests/`).

Run from `sim/`, for example `uv run python exploratory/2026-09-26-tree-parent.py 0.24 0.28 0.32`.

| Script | Finding | What it asks |
|---|---|---|
| `2026-09-26-breath-drive.py` | 6 | How long knots of different depths take to let go when breath acts through drive (even, relaxing, settling) or rhythmic local pressure |
| `2026-09-26-breath-local.py` | 6 | Whether how fast tone eases decides one breath or many; a local effect acting on the wall itself |
| `2026-09-26-tree-siblings-surge.py` | 8 | Eight siblings on one feed: how many a surge of stress shuts, and what a release or an easing root does |
| `2026-09-26-tree-siblings-release.py` | 8 | A knot formed by a local surge among siblings: does releasing it shut a neighbour in its place? |
| `2026-09-26-tree-parent.py` | 8, O13 | A parent vessel feeding four children: a knot in the parent, then its release |
| `2026-09-26-set-knot-rolling.py` | 10 | A set knot at resting tone: does breath movement free it, or a roller's pass each second? |
