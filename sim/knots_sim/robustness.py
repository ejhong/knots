"""How robust is the vessel switch? Sample every uncertain parameter across its range and ask, for each sample, whether
a small artery has two stable states, where rest sits, and what it takes to shut and to reopen it.

This is the plan's method in miniature (sim/PLAN.md §7): existence (does any plausible set give a switch?), the share
of the plausible volume that does, and Sobol indices for which parameters decide it.
"""

from __future__ import annotations

import numpy as np
from SALib.analyze import sobol as sobol_analyze
from SALib.sample import sobol as sobol_sample

from .models import vessel
from .params import load

# The parameters the static switch depends on, sampled across their stated ranges.
VARY = ("Tmax", "r100", "P", "xopt", "beta", "width", "wall", "xc", "porh_rise", "gasp_drop")


def problem() -> dict:
    table = load("vessel")
    return {"num_vars": len(VARY), "names": list(VARY), "bounds": [list(table[k].range) for k in VARY]}


def metrics(p: dict[str, float]) -> dict[str, float]:
    s = vessel.calibrate(p)
    return {
        "bistable": float(s.bistable),
        "Aopen": s.Aopen,
        "Afold": s.Afold,
        "urest": s.urest,
        "width": s.Afold - s.Aopen,  # the band of tone over which open and shut are both stable
        "to_close": s.Afold - s.urest,  # extra tone that shuts a vessel from rest
        "to_hold": s.Aopen - s.urest,  # extra tone that keeps a shut vessel shut (negative: it holds even at rest)
        "gasp": s.gasp,
    }


def run(base_exp: int = 12, seed: int = 7) -> dict:
    prob = problem()
    X = sobol_sample.sample(prob, 2**base_exp, calc_second_order=False, seed=seed)
    base = vessel.params(fitted=False)
    rows = [metrics(base | dict(zip(VARY, x))) for x in X]
    Y = {k: np.array([r[k] for r in rows]) for k in rows[0]}
    ok = Y["bistable"] > 0
    q = lambda k, sel=ok: [float(v) for v in np.quantile(Y[k][sel], [0.05, 0.5, 0.95])]
    out = {
        "samples": int(len(X)),
        "share_bistable": float(ok.mean()),
        "share_holds_at_rest": float((ok & (Y["to_hold"] < 0)).mean()),
        "share_gasp_shuts_at_rest": float((ok & (Y["gasp"] >= Y["to_close"])).mean()),
        "quantiles": {k: q(k) for k in ("Aopen", "Afold", "urest", "width", "to_close", "to_hold")},
    }
    # Which parameters decide the band's width, and how far rest sits below the reopening threshold.
    out["sobol"] = {}
    for k in ("width", "to_hold"):
        y = np.nan_to_num(Y[k], nan=0.0)
        S = sobol_analyze.analyze(prob, y, calc_second_order=False, seed=seed)
        out["sobol"][k] = {n: {"S1": float(S["S1"][i]), "ST": float(S["ST"][i])} for i, n in enumerate(VARY)}
    return out


if __name__ == "__main__":
    import json

    print(json.dumps(run(), indent=1))
