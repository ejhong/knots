"""The trials (sim/PLAN.md §5) as scores for the vessel switch: how a knot forms, holds, and lets go.

Each scenario is a Score of inputs; `summarise` reads the run the way the observations are phrased: is the vessel shut,
when did it shut or open, how large was the flush, how bright the spark.
"""

from __future__ import annotations

import numpy as np

from .models import vessel as v

SHUT = 1.5  # a vessel is shut when its radius is within 1.5 × the shut radius


def scores(p: dict[str, float]) -> dict[str, v.Score]:
    s = v.calibrate(p)
    band = s.Afold - s.Aopen
    surge = s.Afold + 0.03 - s.urest  # a surge of stress that carries tone just past the fold
    deep = s.Aopen + 0.65 * band - s.urest  # tone two-thirds of the way up the window
    marginal = s.Aopen + 0.004 - s.urest  # tone just above the reopening threshold
    fifth = s.Aopen + 0.2 * band - s.urest  # a fifth of the way up the window
    press = p["P"] + 10
    formed = [(10, surge), (40, deep)]  # a surge shuts the vessel; stress falls back but stays raised
    return {
        "gasp_at_rest": v.Score(duration=60, stress=[], gasps=[10], presses=[]),
        "gasp_near_fold": v.Score(duration=90, stress=[(5, deep)], gasps=[30], presses=[]),
        "knot_forms": v.Score(duration=150, stress=formed, gasps=[], presses=[]),
        "stress_eases": v.Score(duration=210, stress=formed + [(110, 0.0)], gasps=[], presses=[]),
        "press_and_release": v.Score(duration=240, stress=formed, gasps=[], presses=[(110, 150, press)],
                                     squeezes=[(110, 150, 1.0)]),
        "even_breath_at_threshold": v.Score(duration=210, stress=formed[:1] + [(40, marginal)], gasps=[], presses=[],
                                            breathing=True),
        "relaxing_breath_at_threshold": v.Score(duration=210, stress=formed[:1] + [(40, marginal)], gasps=[],
                                                presses=[], breathing=True, relaxing=True),
        "breath_holds_deeper": v.Score(duration=210, stress=formed, gasps=[], presses=[], breathing=True),
        # The breath's movement at the knot (the movement route), with drive unchanged: a knot a fifth of the way up.
        "moving_breath": v.Score(duration=240, stress=formed[:1] + [(40, fifth)], gasps=[], presses=[],
                                 moving=True, move=0.3, move_from=40.0),
    }


def summarise(p: dict[str, float], r: dict[str, np.ndarray]) -> dict:
    shut = r["x"] < SHUT * p["xc"]
    t = r["t"]
    edges = np.flatnonzero(np.diff(shut.astype(int)))
    events = [{"t": float(t[i + 1]), "to": "shut" if shut[i + 1] else "open"} for i in edges]
    opened = [e["t"] for e in events if e["to"] == "open"]
    after = before = None
    if opened:
        t0 = opened[0]
        win = (t >= t0) & (t < t0 + 30.0)
        after = float(r["q"][win].max())  # the most flow in the 30 s after it reopens, relative to rest
        before = float(r["q"][np.searchsorted(t, t0) - 5])  # flow just before (near nothing when shut)
    return {
        "shut_at_end": bool(shut[-1]),
        "events": events,
        "peak_flow": float(r["q"].max()),
        "peak_spark": float(r["n"].max()),
        "peak_debt": float(r["m"].max()),
        "flow_before_open": before,
        "flow_after_open": after,
    }


def all_runs(p: dict[str, float], dt: float = 0.02) -> dict[str, tuple[dict, dict]]:
    return {name: (r := v.run(p, sc, dt), summarise(p, r)) for name, sc in scores(p).items()}


if __name__ == "__main__":
    p = v.params()
    for name, (_, s) in all_runs(p).items():
        ev = ", ".join(f"{e['to']} at {e['t']:.1f} s" for e in s["events"]) or "no change"
        print(f"{name:26} {ev:40} shut at end: {s['shut_at_end']!s:5}  flow ≤ {s['peak_flow']:.2f}×  spark ≤ {s['peak_spark']:.2f}  debt ≤ {s['peak_debt']:.2f}")
