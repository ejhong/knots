"""Length adaptation (variant T1a): held long enough, a vessel's muscle adapts to the length it is held at.

Smooth muscle held at a new length regains its force there: its length–tension curve shifts toward the held length
(syyong2008, pratusevich1995, bednarek2011). Arterioles held constricted for hours reposition their cells and no longer
relax fully when the drive is removed (martinezlemus2004, hill2003); held for days, they remodel inward, and only if
their muscle is active (bakker2002).

The muscle's optimal length lo (1: adapted to the vessel's normal size) follows the length it is held at, at a rate set
by its activation A:

    dlo/dt = A · (lo* − lo) / tau_adapt,    lo* = 1 + φ · (ℓ/ℓ_rest − 1)

ℓ is the muscle's length now and ℓ_rest its length at the resting radius, so a vessel at rest stays as it is; φ is how
far the optimum follows (fitted to syyong2008). Adaptation takes an hour; everything else in the vessel takes seconds
to a minute. So the vessel is taken to be at equilibrium while lo moves (two timescales): from its last radius it goes
where the forces push it, to the next balance, or shut. Activation is the tone command itself here: the nerve's
dilator, myogenic easing and movement's loosening act over seconds and are left to the full model.

    uv run python -m knots_sim.adapt     # prints the study
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .models import vessel as v
from .params import load, values

HOUR = 3600.0
GRID = 2400
SHORT = 0.6  # syyong2008: shortened to 0.6 of the reference length


def share_for(width: float, recovery: float) -> float:
    """The share φ that regains `recovery` of the force lost at 0.6 of the reference length (closed form)."""
    g0 = np.exp(-(((SHORT - 1) / width) ** 2))
    g1 = g0 + recovery * (1 - g0)
    lo = SHORT / (1 - width * np.sqrt(-np.log(g1)))
    return float((1 - lo) / (1 - SHORT))


def params(fitted: bool = True, **overrides: float) -> dict[str, float]:
    """Vessel parameters (fitted timings unless fitted=False; the adaptation needs only the static switch), the
    adaptation table, and the share fitted to its target unless overridden."""
    own = set(values("adapt"))
    p = v.params(fitted=fitted, **{k: x for k, x in overrides.items() if k not in own})
    p |= values("adapt") | {k: x for k, x in overrides.items() if k in own}
    if "adapt_share" not in overrides:
        p["adapt_share"] = share_for(p["width"], p["recovery_06"])
    return p


@dataclass
class Vessel:
    """What the adaptation needs from the vessel: its equilibrium curve for any lo, rest, and its muscle's lengths."""

    p: dict[str, float]

    def __post_init__(self):
        s = v.calibrate(self.p | {"lo": 1.0})
        self.xrest, self.urest, self.Aopen0, self.Afold0 = s.xrest, s.urest, s.Aopen, s.Afold
        self.xs = np.linspace(self.p["xc"], 1.3, GRID)
        self._aeq = v.numeric()[1]
        aw, xo = self.p["wall"], self.p["xopt"]
        self.ell = lambda x: np.sqrt(np.asarray(x) ** 2 + aw / 2) / np.sqrt(xo**2 + aw / 2)
        self.ell_rest = float(self.ell(self.xrest))

    def curve(self, lo: float) -> np.ndarray:
        return self._aeq(self.xs, 0.0, v.vector(self.p | {"lo": lo}))

    def aopen(self, lo: float) -> float:
        """Tone below which a shut vessel with optimum lo reopens."""
        return float(self._aeq(self.p["xc"], 0.0, v.vector(self.p | {"lo": lo})))

    def target(self, x: float) -> float:
        return 1 + self.p["adapt_share"] * (float(self.ell(x)) / self.ell_rest - 1)

    def settle(self, a: np.ndarray, A: float, x0: float) -> float:
        """Where a vessel at radius x0 comes to rest under tone A: it widens while A is below the tone that holds its
        radius, narrows while above, and stops at the first balance; the shut radius if nothing stops it."""
        xs = self.xs
        i = int(np.clip(np.searchsorted(xs, x0), 0, len(xs) - 1))
        if a[i] > A:  # the pressure wins: it widens to the first radius the tone can hold
            j = i + int(np.argmax(a[i:] <= A))
            return float(np.interp(A, [a[j], a[j - 1]], [xs[j], xs[j - 1]])) if j > i else float(xs[i])
        below = np.flatnonzero(a[: i + 1] >= A)  # the muscle wins: it narrows to the nearest balance below
        if len(below) == 0:
            return float(xs[0])
        j = int(below[-1])
        return float(np.interp(A, [a[j], a[j + 1]], [xs[j], xs[j + 1]])) if j < i else float(xs[j])

    def shut(self, x: float) -> bool:
        return x <= self.p["xc"] * 1.5


def run(p: dict[str, float], tone: list[tuple[float, float]], hours: float, dt: float = 60.0,
        x0: float | None = None, lo0: float = 1.0, ves: Vessel | None = None) -> dict[str, np.ndarray]:
    """The two-timescale model under a tone schedule [(from time s, tone)], starting at radius x0 (rest by default)."""
    V = ves or Vessel(p)
    t = np.arange(0.0, hours * HOUR, dt)
    starts = np.array([a for a, _ in tone])
    levels = np.array([u for _, u in tone])
    x, lo = (V.xrest if x0 is None else x0), lo0
    out = {k: np.empty(len(t)) for k in ("x", "lo", "A", "aopen")}
    for i, ti in enumerate(t):
        A = float(levels[np.searchsorted(starts, ti, side="right") - 1])
        x = V.settle(V.curve(lo), A, x)
        out["x"][i], out["lo"][i], out["A"][i], out["aopen"][i] = x, lo, A, V.aopen(lo)
        lo_star = V.target(x)
        lo = lo_star + (lo - lo_star) * np.exp(-A * dt / p["tau_adapt"])
    q = np.where([V.shut(x) for x in out["x"]], 0.0, (out["x"] / V.xrest) ** 4)
    return {"t": t, **out, "q": q, "urest": V.urest}


# ---------- What adaptation does ----------


def lo_to_hold_at_rest(V: Vessel) -> float | None:
    """The optimum at which a shut vessel holds at resting tone (Aopen = urest); None if even full adaptation fails."""
    lo_full = V.target(V.p["xc"])
    if V.aopen(lo_full) > V.urest:
        return None
    lo_hi, lo_lo = 1.0, lo_full
    for _ in range(40):
        mid = (lo_hi + lo_lo) / 2
        lo_hi, lo_lo = (mid, lo_lo) if V.aopen(mid) > V.urest else (lo_hi, mid)
    return (lo_hi + lo_lo) / 2


def time_to_set(V: Vessel, S: float) -> float | None:
    """Seconds a knot must be held shut at tone S before it holds at resting tone; None if it never does (or if S
    cannot hold it shut in the first place)."""
    lo_set, lo_full = lo_to_hold_at_rest(V), V.target(V.p["xc"])
    if lo_set is None or S <= V.Aopen0:
        return None
    frac = (lo_set - lo_full) / (1 - lo_full)  # share of the way still to go when it sets
    return float(-V.p["tau_adapt"] / S * np.log(frac)) if 0 < frac < 1 else 0.0


def held(p: dict[str, float], S: float, for_s: float, after_h: float = 6.0, ves: Vessel | None = None) -> dict:
    """A knot just formed, held at tone S for `for_s` seconds, then rest: does it outlast its stress?"""
    V = ves or Vessel(p)
    r = run(p, [(0.0, S), (for_s, V.urest)], hours=for_s / HOUR + after_h, x0=p["xc"], ves=V)
    end = int(np.searchsorted(r["t"], for_s))
    stays = bool(V.shut(r["x"][-1]))
    return {"held_s": for_s, "aopen_at_end": float(r["aopen"][end]), "stays": stays, "lo_at_end": float(r["lo"][end])}


def creep(p: dict[str, float], S: float, hours: float = 24.0, ves: Vessel | None = None) -> float | None:
    """Seconds until an open vessel under sustained tone S shuts as its muscle adapts; None within `hours`."""
    V = ves or Vessel(p)
    r = run(p, [(0.0, S)], hours=hours, ves=V, dt=120.0)
    idx = np.flatnonzero([V.shut(x) for x in r["x"]])
    return float(r["t"][idx[0]]) if len(idx) else None


def released(p: dict[str, float], lo: float, hours: float = 8.0, ves: Vessel | None = None) -> dict:
    """A shut knot with optimum lo is let go (tone dips to nothing for a minute), then rests: the flow it opens to, and
    what the model does after. Only the first is sound: what follows turns on the open vessel's slow dynamics, which
    the model gets wrong (see `creep` and study()["lab"])."""
    V = ves or Vessel(p)
    r = run(p, [(0.0, 0.0), (60.0, V.urest)], hours=hours, x0=p["xc"], lo0=lo, ves=V, dt=60.0)
    q, t = r["q"], r["t"]
    after = t >= 60.0
    at_release = float(q[np.argmax(after)])
    high = np.flatnonzero(after & (q >= 1.2))
    shut_again = np.flatnonzero(after & (q == 0))
    return {"lo": lo, "peak_flow": at_release, "flush_h": float((t[high[-1]] - 60.0) / HOUR) if len(high) else 0.0,
            "reshut_h": float((t[shut_again[0]] - 60.0) / HOUR) if len(shut_again) else None, "t": t, "q": q}


def lo_after(V: Vessel, S: float, held_s: float) -> float:
    """The optimum of a knot held shut at tone S for `held_s` seconds (closed form while it stays shut)."""
    lo_full = V.target(V.p["xc"])
    return float(lo_full + (1 - lo_full) * np.exp(-S * held_s / V.p["tau_adapt"]))


def remodelled(p: dict[str, float]) -> dict:
    """Days on: the lumen remodels inward around the same wall (bakker2002; eutrophic, bakker2004). A static check:
    the tone that holds a shut vessel once its relaxed radius is smaller by remodel_3d, against the same resting drive."""
    V = Vessel(p)
    k = 1 - p["remodel_3d"]
    q = p | {"r100": p["r100"] * k, "wall": p["wall"] / k**2}
    W = Vessel(q)
    return {"shrink": p["remodel_3d"], "aopen_over_rest": W.Aopen0 / V.urest,
            "adapted_aopen_over_rest": W.aopen(W.target(q["xc"])) / V.urest, "before": V.Aopen0 / V.urest}


VARY = ("tau_adapt", "adapt_share", "width", "wall", "xc", "r100", "Tmax", "P", "xopt", "beta")


def robustness(n: int = 512, seed: int = 3, within_h: float = 4.0) -> dict:
    """Across plausible settings: is there a switch; can a shut vessel adapt until it holds at rest; and how long must
    it be held, at the tone midway up its band, before it does."""
    from scipy.stats import qmc

    tables = load("vessel") | load("adapt")
    lo_b = [tables[k].range[0] for k in VARY]
    hi_b = [tables[k].range[1] for k in VARY]
    X = qmc.scale(qmc.Sobol(len(VARY), seed=seed).random(n), lo_b, hi_b)
    base = params(fitted=False)
    bistable = sets_ever = sets_soon = 0
    times = []
    for x in X:
        q = base | dict(zip(VARY, x))
        q["xrest"] = v.calibrate(q | {"lo": 1.0}).xrest
        V = Vessel(q)
        if not (0 < V.Aopen0 < V.Afold0 < 1):
            continue
        bistable += 1
        ts = time_to_set(V, (V.Aopen0 + V.Afold0) / 2)
        if ts is None:
            continue
        sets_ever += 1
        times.append(ts / HOUR)
        sets_soon += ts <= within_h * HOUR
    qs = [float(v_) for v_ in np.quantile(times, [0.05, 0.5, 0.95])] if times else [None] * 3
    return {"samples": n, "share_bistable": bistable / n, "share_sets": sets_ever / max(bistable, 1),
            "share_sets_within": sets_soon / max(bistable, 1), "within_h": within_h, "set_h": qs}


def _thin(t: np.ndarray, *ys: np.ndarray, every: int) -> list[list[float]]:
    return [[round(float(a), 4) for a in t[::every] / HOUR]] + [[round(float(a), 4) for a in y[::every]] for y in ys]


def study() -> dict:
    """Everything the site and the findings show about adaptation."""
    p = params(fitted=False)
    out = {"share": p["adapt_share"], "tau_h": p["tau_adapt"] / HOUR}
    walls = {"healthy": p["wall"], "hypertensive": v.wall_area(0.08)}
    mults = [round(1.5 + 0.25 * i, 2) for i in range(15)]  # hold tones, in multiples of resting tone
    for name, w in walls.items():
        q = params(fitted=False, wall=w)
        V = Vessel(q)
        lo_set = lo_to_hold_at_rest(V)
        full = V.target(q["xc"])
        sets = {m: time_to_set(V, m * V.urest) for m in mults}
        creeps = {m: creep(q, m * V.urest, ves=V) for m in mults if m <= 3.5}
        out[name] = {
            "urest": V.urest, "aopen_over_rest": V.Aopen0 / V.urest, "afold_over_rest": V.Afold0 / V.urest,
            "lo_full": full, "lo_set": lo_set, "adapted_aopen_over_rest": V.aopen(full) / V.urest,
            "set_h": [{"mult": m, "hours": None if s is None else s / HOUR} for m, s in sets.items()],
            "creep_h": [{"mult": m, "hours": None if c is None else c / HOUR} for m, c in creeps.items()],
        }
    # One knot, formed by a surge and held at four times resting tone, for an hour or for three; then rest.
    V = Vessel(p)
    S = 4.0 * V.urest
    stories = {}
    for label, for_h in (("hour", 1.0), ("three", 3.0)):
        r = run(p, [(0.0, S), (for_h * HOUR, V.urest)], hours=6.0, x0=p["xc"], ves=V, dt=60.0)
        stories[label] = {"held_h": for_h, "stays": bool(V.shut(r["x"][-1])),
                          "series": _thin(r["t"], r["A"] / V.urest, r["aopen"] / V.urest, r["q"], every=5)}
    out["stories"] = {"hold_mult": 4.0, **stories}
    # Let go after being held for different times: the flush, from nothing to a lasting wave.
    ages = (0.0, 0.5, 1.0, 2.0, 4.0, 24.0)
    flushes = []
    for h in ages:
        lo = lo_after(V, S, h * HOUR)
        r = released(p, lo, hours=8.0, ves=V)
        flushes.append({"held_h": h, "lo": lo, "holds_at_rest": V.aopen(lo) < V.urest, "peak_flow": r["peak_flow"],
                        "flush_h": r["flush_h"], "reshut_h": r["reshut_h"]})
    out["flushes"] = flushes
    # The lab's arterioles, held at 61% of their diameter for 4 hours, kept it (martinezlemus2004). The model at
    # constant drive would not: how soon it shuts one held there.
    curve = V.curve(1.0)
    open_side = V.xs > V.xs[np.argmax(curve)]
    tone61 = float(np.interp(0.61 * V.xrest, V.xs[open_side], curve[open_side]))
    shut61 = creep(p, tone61, hours=8.0, ves=V)
    out["lab"] = {"diameter": 0.61, "tone_over_rest": tone61 / V.urest, "shuts_h": None if shut61 is None else shut61 / HOUR}
    out["remodel"] = remodelled(p)
    out["robustness"] = robustness()
    return out


if __name__ == "__main__":
    import json

    s = study()
    s.pop("stories")
    print(json.dumps(s, indent=1, default=float))
