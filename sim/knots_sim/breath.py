"""How the breath might release a knot, kept open (sim/PLAN.md §2): each route a variant, run on knots of every depth.

A knot's depth is how far the drive holding it sits above its own reopening threshold, as a fraction of the switch's
band (0: at the threshold; 1: at the fold). Every trial forms the knot the same way (a surge shuts the vessel, then
drive falls back to the knot's depth) and then breathes for 30 breaths:

    drive, even       the breath swings drive up and down (breath_swing)
    drive, uneven     the out-breath lowers drive and the in-breath does not raise it
    drive, settling   drive eases over a minute and stays down
    movement          the breath deforms the tissue at the knot (a fraction of a squeeze that shuts the vessel)

and reports when the knot lets go, if it does. For the movement route, which nobody has measured at a knot, it also
reports what would have to be true: the least movement per breath that releases a knot of each depth within a few
breaths.
"""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor

import numpy as np

from .models import vessel as v
from .scenarios import SHUT

DEPTHS = (0.01, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8)
T0, BREATHS, PERIOD = 40.0, 30, 10.0
ROUTES = (
    ("drive, even", "even", (0.03,)),
    ("drive, uneven", "uneven", (0.03, 0.06, 0.12)),
    ("drive, settling", "settling", (0.03, 0.06, 0.12)),
    ("movement", "movement", (0.05, 0.1, 0.2, 0.3, 0.5)),
)


def score(p: dict[str, float], depth: float, route: str, size: float, breaths: int = BREATHS) -> v.Score:
    s = v.calibrate(p)
    band = s.Afold - s.Aopen
    formed = [(10.0, s.Afold + 0.03 - s.urest), (T0, s.Aopen + depth * band - s.urest)]
    sc = v.Score(duration=T0 + breaths * PERIOD, stress=formed, gasps=[], presses=[])
    if route in ("even", "uneven"):
        sc.breathing, sc.relaxing = True, route == "uneven"
    elif route == "settling":
        sc.settle = (T0, 60.0, size)
    elif route == "movement":
        sc.moving, sc.move, sc.move_from = True, size, T0
    return sc


def release_time(p: dict[str, float], sc: v.Score, route: str, size: float, dt: float = 0.02) -> float | None:
    """Seconds after breathing begins until the knot lets go; None if it holds."""
    q = p | ({"breath_swing": size} if route in ("even", "uneven") else {})
    u = sc.inputs(q, dt)
    y = v.rk4(q, u, dt)
    t = np.arange(len(u)) * dt
    shut = y[:, 0] < SHUT * p["xc"]
    if not shut[int(T0 / dt) - 1]:
        return float("nan")  # the knot never formed
    after = np.flatnonzero((t >= T0) & ~shut)
    return float(t[after[0]] - T0) if len(after) else None


def _one(args):
    p, depth, route, size = args
    return release_time(p, score(p, depth, route, size), route, size)


def least_movement(p: dict[str, float], depth: float, breaths: int, lo: float = 0.0, hi: float = 1.0,
                   tol: float = 0.005) -> float | None:
    """The least movement per breath that releases a knot of this depth within this many breaths (bisection)."""
    ok = lambda a: (r := release_time(p, score(p, depth, "movement", a, breaths), "movement", a)) is not None and r == r
    if not ok(hi):
        return None
    while hi - lo > tol:
        mid = (lo + hi) / 2
        lo, hi = (lo, mid) if ok(mid) else (mid, hi)
    return hi


def _least(args):
    p, depth, breaths = args
    return least_movement(p, depth, breaths)


def maps(p: dict[str, float] | None = None, workers: int = 8) -> dict:
    p = p or v.params()
    jobs = [(p, d, route, size) for _, route, sizes in ROUTES for size in sizes for d in DEPTHS]
    with ProcessPoolExecutor(workers) as ex:
        times = list(ex.map(_one, jobs))
        need_jobs = [(p, d, n) for n in (3, 10) for d in DEPTHS]
        need = list(ex.map(_least, need_jobs))
    it = iter(times)
    rows = [{"label": label, "route": route, "size": size, "release_s": [next(it) for _ in DEPTHS]}
            for label, route, sizes in ROUTES for size in sizes]
    n = len(DEPTHS)
    return {"depths": list(DEPTHS), "breath_period": PERIOD, "breaths": BREATHS, "rows": rows,
            "least_movement": {"within_3": need[:n], "within_10": need[n:]}}


if __name__ == "__main__":
    import time

    t0 = time.time()
    m = maps()
    for r in m["rows"]:
        cells = " ".join("  holds" if x is None else f"{x:6.0f}s" for x in r["release_s"])
        print(f"{r['label']:16} {r['size']:<5} {cells}")
    for k, xs in m["least_movement"].items():
        print(f"least movement {k}: " + " ".join("  none" if x is None else f"{x:6.3f}" for x in xs))
    print(f"{time.time() - t0:.0f} s")
