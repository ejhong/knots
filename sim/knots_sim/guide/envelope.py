"""What a breath would have to do (sim/PLAN.md §2): whatever its pattern, a breath reaches a knot only through a few routes,
and through drive it has to lower the knot's own drive enough, for long enough. For each theory, starting from the knots a
stressful moment leaves, the knot at the spot's drive is lowered by a step of size ΔS (a share of the holding stress) for D
seconds, aimed at it alone, with nothing else changing; the least ΔS that lets it go within D + 20 s is found by bisection,
in every setting. Perception has no local drive: its step lowers arousal, everywhere.

Any breath, however complex, then either reaches that envelope at the knot or does not: the models need its effect, not
its pattern. A slow out-breath, subtle breaths and minutes of slow breathing are marked against it from the shared
interface's numbers (params/interface.yaml).
"""

from __future__ import annotations

import numpy as np

from .base import GONE, releases
from .scenes import Scene

DURATIONS = (1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0)
AFTER = 20.0  # s after the step ends in which a release still counts
STEPS = 7  # bisection: to 1/128 of the holding stress


def _released(runner, D: float, dS: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per setting: whether the knot at the spot lets go under a step of dS (in the shared unit) lasting D s; and whether
    there was a knot there to begin with."""
    sc = Scene("envelope", "", "", "formed", D + AFTER, 0.5, film=False, calm_until=D)
    runner._dS = dS
    run = runner.run(sc)
    K = runner.K
    tg = run.target
    held0 = run.held[0, np.arange(K), tg]
    rel = np.zeros(K, bool)
    for k, j, tr in releases(run.t, run.held):
        if j == tg[k] and tr <= D + AFTER - GONE:
            rel[k] = True
    return rel & held0, held0


def envelope(runner) -> dict:
    """The least step, as a share of the holding stress, that lets the knot at the spot go, per duration and setting
    (nan where even a fall to rest does not, or where there is no knot at the spot)."""
    K = runner.K
    hold = np.array([p["hold"] for p in runner.ps])
    need = np.full((len(DURATIONS), K), np.nan)
    held = np.zeros(K, bool)
    for i, D in enumerate(DURATIONS):
        ok_top, held = _released(runner, D, hold.copy())  # the most a calming can do: drive down to rest
        lo, hi = np.zeros(K), hold.copy()
        for _ in range(STEPS):
            mid = (lo + hi) / 2
            ok, _ = _released(runner, D, mid)
            hi, lo = np.where(ok, mid, hi), np.where(ok, lo, mid)
        need[i] = np.where(ok_top, hi / hold, np.nan)
    runner._dS = np.zeros(K)
    return {"durations": list(DURATIONS), "need": need, "held": held}


def summary(env: dict, ps: list[dict]) -> dict:
    """For the site: per duration, over the settings with a knot at the spot, the least step (share of the holding stress)
    that frees it in the easiest quarter, the median and the hardest quarter of them (None: not even a fall to rest), and
    the share that no step frees; and what a breath does, in the same terms."""
    need, held = env["need"], env["held"]
    rows = []
    for i, D in enumerate(env["durations"]):
        x = np.where(np.isfinite(need[i][held]), need[i][held], np.inf)
        q = (lambda p: _r(np.quantile(x, p)) if len(x) and np.isfinite(np.quantile(x, p)) else None)
        rows.append({"d": D, "q25": q(0.25), "median": q(0.5), "q75": q(0.75), "never": _r(np.isinf(x).mean()) if len(x) else None,
                     "n": int(held.sum())})
    hold = np.array([p["hold"] for p in ps])
    fall = np.array([p["breath_fall"] for p in ps]) / hold
    calm = np.array([p["breath_calm"] for p in ps]) / hold
    breath = {"out_breath": _r(np.median(fall)), "subtle": _r(np.median(fall) / 3), "minutes": _r(np.median(calm))}
    return {"rows": rows, "breath": breath}


def _r(x) -> float:
    return round(float(x), 3)
