"""The hand or the attention it draws (Q4): each theory's press, taken apart.

The author (27 Sep 2026): "we don't know if the palpitation pressure vs complex meditative breath for release. I think
breath plus attention alone may be enough but the pressure may help focus attention to area." The exam's press (O2) has
the two together. This runs each modelled theory's own patch trial (knots_sim/exam.py `Patch`) four ways, the slow
breaths going on in all: after 30 broad breaths, for PRESS_FOR s at the spot, a hand with attention there (press),
attention alone (attend), a hand while attention is elsewhere (hand), or neither (rest); then 30 s more of slow breaths.
Nothing else changes: each theory takes attention and a hand as its trials always do (the top of its file in theories/
says how), in all its settings.

Per theory and variant, pooled over its settings: of the knots held under the hand's place when the work began, the share
that let go by 30 s after it ended, and their median time; the same share among knots elsewhere in the patch (what the
breaths alone let go there, whatever the spot's work). Against rest, what attention alone adds at the spot, what a hand
alone adds, and what the hand adds to attention.

    uv run python -m knots_sim.apart
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from . import exam
from .exam import PATCH, PRESS_FOR, Patch

KINDS = ("rest", "attend", "hand", "press")
RUNS = {"T1": ("t1", ("drive", "movement", "aimed")), "T3": ("t3", ("drive", "drive+stretch", "aimed")),
        "T7": ("t7", ("inhibit", "excite")), "T6": ("t6", ("arousal",))}
WINDOW = PRESS_FOR + 30.0  # the minute's work and the 30 s after it


def shares(out, window: float = WINDOW) -> dict:
    """From a PatchOut: of the knots held at the spot (and elsewhere) when the work began, the share let go within the
    window, pooled over settings; the median time at the spot; the settings with a knot there."""
    near = PATCH["near"]
    spot_n = spot_go = else_n = else_go = sets = 0
    times: list[float] = []
    for held0, rel in zip(out.held0, out.rel_t):
        went = held0 & np.isfinite(rel) & (np.nan_to_num(rel, nan=np.inf) <= window)
        spot_n += int((held0 & near).sum())
        spot_go += int((went & near).sum())
        else_n += int((held0 & ~near).sum())
        else_go += int((went & ~near).sum())
        sets += bool((held0 & near).any())
        times += [float(x) for x in rel[went & near]]
    return {"settings": sets, "knots": spot_n, "spot": spot_go / spot_n if spot_n else None,
            "elsewhere": else_go / else_n if else_n else None, "median_s": float(np.median(times)) if times else None}


def _job(args) -> tuple:
    tid, variant, kind = args
    th = exam._theory(RUNS[tid][0])
    ps = th.sample(exam.K, exam.SEED)
    return tid, variant, kind, shares(th.patch(ps, variant, Patch(kind)))


def inputs_hash() -> str:
    """The exam's inputs (its trials, theories, models and tables) and this file: apart.json carries it; a test fails
    when it is stale."""
    h = hashlib.sha256(exam.inputs_hash().encode())
    h.update(Path(__file__).read_bytes())
    return h.hexdigest()[:12]


SITE = exam.SITE.parent / "apart.json"


def main(workers: int = 4) -> dict:
    from concurrent.futures import ProcessPoolExecutor

    from .export import _git

    jobs = [(tid, v, kind) for tid, (_, variants) in RUNS.items() for v in variants for kind in KINDS]
    with ProcessPoolExecutor(workers) as pool:
        done = list(pool.map(_job, jobs))
    rows: dict = {}
    for tid, variant, kind, r in done:
        rows.setdefault(tid, {}).setdefault(variant, {})[kind] = r
    out = {"run": {"inputs": inputs_hash(), **_git()}, "exam": exam.spec()["version"], "samples": exam.K,
           "press_s": PRESS_FOR, "window_s": WINDOW, "kinds": list(KINDS), "rows": rows}
    SITE.write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False) + "\n")
    return out


if __name__ == "__main__":
    o = main()
    for tid, vs in o["rows"].items():
        for v, kinds in vs.items():
            print(tid, v, {k: (None if r["spot"] is None else round(r["spot"], 2)) for k, r in kinds.items()},
                  "elsewhere", {k: (None if r["elsewhere"] is None else round(r["elsewhere"], 2)) for k, r in kinds.items()})
