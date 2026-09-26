"""T1, the vessel switch: a perforator's small artery, held open or shut by its own wall.

A small artery with smooth muscle in its wall obeys Laplace's law: the pressure inside pushes out with a force per
unit length of P·r, and the wall pulls in with its passive tension plus its active tension. Because active tension
depends on how stretched the muscle is, the balance has two stable answers over a band of tone: open, or shut. The
vessel closes when tone passes a fold, and reopens only when tone falls well below it (Burton 1951; Miller 2026).

States (all dimensionless):
    x    lumen radius, in units of r100 (the radius a relaxed vessel would have at 100 mmHg)
    A    smooth-muscle activation, 0..1 of maximal active tension
    m    oxygen debt of the vessel's territory, 0..1, sensed by its sensory nerves (tenderness)
    n    sensory-nerve dilator released when blood returns to a patch in debt (the spark, and the flush)
    my   myogenic relaxation under sustained external pressure, 0..1
    ml   the shape the wall registers: the local deformation, remembered over tau_mv
    w    loosening captured from changes of shape (a squeeze, its release, a movement), 0..1
    z    loosening expressed on the wall's force, 0..1: the muscle pulls with A·(1 − n)·(1 − z)
Inputs:
    uS   tone command, 0..1: resting tone plus stress, breath and a deep gasp
    Pext external pressure on the tissue (mmHg)
    mv   local deformation of the tissue, 0..1, as a fraction of a squeeze that shuts the vessel

Movement loosens the wall: a squeezed artery widens seconds after release, and more after several squeezes than
after one long one (clifford2006); rhythmic stretch cuts vascular smooth muscle's force at once (ljung1975). The
wall answers changes of shape, not held shapes.

The equations are written once here; `numeric()` gives fast functions for Python, and `knots_sim.codegen` writes the
same expressions out as TypeScript for the site.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np
import sympy as sp

from ..params import values

MMHG = 133.322  # Pa
EPS_FLOOR = 0.01  # width of the soft floor at the shut radius

STATES = ("x", "A", "m", "n", "my", "ml", "w", "z")
INPUTS = ("uS", "Pext", "mv")
# Parameters the equations use: the YAML keys, plus xrest (resting radius, from calibration).
PARAMS = ("r100", "Tmax", "xopt", "P", "beta", "width", "wall", "xc", "tau_x", "tau_up", "tau_down",
          "tau_debt", "tau_nerve", "collateral", "myogenic", "tau_myogenic", "tau_mv", "k_mv", "tau_w", "tau_z",
          "xrest")


@lru_cache
def laws() -> dict[str, sp.Expr]:
    """The model as symbolic expressions."""
    x, A, m, n, my, ml, lw, z = sp.symbols(STATES, real=True)
    uS, Pext, mv = sp.symbols(INPUTS, real=True)
    (r100, Tmax, xopt, P, beta, w, aw, xc, tau_x, tau_up, tau_down, tau_debt, tau_n, c, kmy, tau_my, tau_mv,
     k_mv, tau_w, tau_z, xrest) = sp.symbols(PARAMS, real=True)

    T100 = 100 * MMHG * r100  # passive tension of a relaxed vessel at 100 mmHg, by definition of r100
    Tp = T100 * (sp.exp(beta * (x - 1)) - sp.exp(-beta)) / (1 - sp.exp(-beta))
    ell = sp.sqrt(x**2 + aw / 2) / sp.sqrt(xopt**2 + aw / 2)  # mid-wall muscle length / optimal length
    g = sp.exp(-(((ell - 1) / w) ** 2))  # active length-tension
    Ptm = (P - Pext) * MMHG
    F = Ptm * r100 * x - Tp - A * (1 - n) * (1 - z) * Tmax * g  # net outward force per unit length (N/m)
    Aeq = (Ptm * r100 * x - Tp) / (Tmax * g)  # effective tone A·(1 − n)·(1 − z) that balances radius x

    q = (x / xrest) ** 4  # flow relative to rest (Poiseuille)
    press = sp.Min(sp.Max(Pext / P, 0), 1)  # how hard the patch is pressed
    q1 = sp.Min(q, 1)
    supply = q1 + c * (1 - press) * (1 - q1)  # own flow, plus what neighbours bring through linking vessels
    Ainf = uS * (1 - kmy * my)  # nerve drive, eased by myogenic relaxation under pressure

    Fn = F / T100
    floor = 1 - sp.exp(-sp.Max(x - xc, 0) / EPS_FLOOR)
    dx = (sp.Max(Fn, 0) + sp.Min(Fn, 0) * floor) / tau_x
    dA = sp.Piecewise(((Ainf - A) / tau_up, Ainf > A), ((Ainf - A) / tau_down, True))
    dm = ((1 - supply) - m) / tau_debt
    dn = (m * q1 - n) / tau_n
    dmy = (press - my) / tau_my
    dml = (mv - ml) / tau_mv  # the shape the wall registers follows the tissue's
    dlw = k_mv * sp.Abs(mv - ml) * (1 - lw) - lw / tau_w  # each change of shape adds loosening, saturating
    dz = (lw - z) / tau_z  # and it reaches the wall's force a few seconds later
    return {"Tp": Tp, "g": g, "F": F, "Aeq": Aeq, "q": q, "rhs": sp.Matrix([dx, dA, dm, dn, dmy, dml, dlw, dz])}


@lru_cache
def numeric():
    """Numpy functions of the symbolic laws: rhs(y, u, p), Aeq(x, p), flow(x, p)."""
    L = laws()
    ys = sp.symbols(STATES, real=True)
    us = sp.symbols(INPUTS, real=True)
    ps = sp.symbols(PARAMS, real=True)
    rhs = sp.lambdify((ys, us, ps), list(L["rhs"]), "math")
    x, Pext = sp.Symbol("x", real=True), sp.Symbol("Pext", real=True)
    aeq = sp.lambdify((x, Pext, ps), L["Aeq"], "numpy")
    return rhs, aeq


def params(fitted: bool = True, **overrides: float) -> dict[str, float]:
    """Parameter values from params/vessel.yaml with overrides; the resting radius from calibration; and, unless
    fitted=False, the three timing constants fitted to their measured targets (see `fit`)."""
    p = values("vessel") | overrides
    p["xrest"] = calibrate(p).xrest
    if fitted:
        p |= fit(tuple(sorted(p.items())))
        p |= fit_movement(tuple(sorted(p.items())))
    return p


def vector(p: dict[str, float]) -> tuple[float, ...]:
    return tuple(p[k] for k in PARAMS)


@dataclass(frozen=True)
class Switch:
    """What the balance of forces says about one vessel at one pressure."""

    xp: float  # relaxed radius (no tone)
    xrest: float  # resting radius: relaxing fully raises flow by porh_rise
    urest: float  # resting tone
    xfold: float  # radius at the fold
    Afold: float  # tone above which an open vessel snaps shut
    Aopen: float  # tone below which a shut vessel reopens
    gasp: float  # extra tone in a deep gasp (sized to the measured fall in flow)

    @property
    def window(self) -> tuple[float, float]:
        return (self.Aopen, self.Afold)

    @property
    def bistable(self) -> bool:
        return 0 < self.Aopen < self.Afold < 1


def aeq_curve(p: dict[str, float], n: int = 600, Pext: float = 0.0) -> tuple[np.ndarray, np.ndarray]:
    """The equilibrium curve: radius x from the shut radius to the relaxed one, and the tone that holds each."""
    _, aeq = numeric()
    pv = vector({**p, "xrest": p.get("xrest", 1.0)})
    xs = np.linspace(p["xc"], 1.2, n)
    return xs, aeq(xs, Pext, pv)


def calibrate(p: dict[str, float]) -> Switch:
    _, aeq = numeric()
    pv = vector({**p, "xrest": 1.0})
    xs = np.linspace(p["xc"], 1.5, 6000)
    a = aeq(xs, 0.0, pv)
    # Relaxed radius: where no tone is needed (the curve crosses zero from above).
    k = np.flatnonzero((a[:-1] > 0) & (a[1:] <= 0))
    xp = float(np.interp(0, [a[k[0] + 1], a[k[0]]], [xs[k[0] + 1], xs[k[0]]])) if len(k) else float("nan")
    xrest = xp / (1 + p["porh_rise"]) ** 0.25
    urest = float(aeq(xrest, 0.0, pv))
    inside = xs < xp
    i = int(np.argmax(np.where(inside, a, -np.inf)))
    xfold, Afold = float(xs[i]), float(a[i])
    Aopen = float(aeq(p["xc"], 0.0, pv))
    xg = xrest * (1 - p["gasp_drop"]) ** 0.25
    gasp = float(aeq(xg, 0.0, pv)) - urest if xg > xfold else Afold - urest
    return Switch(xp, xrest, urest, xfold, Afold, Aopen, gasp)


# ---------- Simulation ----------


def rk4(p: dict[str, float], u: np.ndarray, dt: float, y0: np.ndarray | None = None) -> np.ndarray:
    """Fixed-step RK4 with inputs held over each step (the same stepper the site runs). Plain floats: a handful of
    states step faster without numpy."""
    rhs, _ = numeric()
    pv = vector(p)
    xc = p["xc"]
    y = [float(v) for v in (y0 if y0 is not None else rest_state(p))]
    out = np.empty((len(u), len(STATES)))
    h2, h6 = dt / 2, dt / 6
    for i, ui in enumerate(u.tolist()):
        out[i] = y
        k1 = rhs(y, ui, pv)
        k2 = rhs([a + h2 * b for a, b in zip(y, k1)], ui, pv)
        k3 = rhs([a + h2 * b for a, b in zip(y, k2)], ui, pv)
        k4 = rhs([a + dt * b for a, b in zip(y, k3)], ui, pv)
        y = [a + h6 * (b + 2 * c + 2 * d + e) for a, b, c, d, e in zip(y, k1, k2, k3, k4)]
        y[0] = max(y[0], xc)
        for j in range(1, len(STATES)):
            y[j] = min(max(y[j], 0.0), 1.0)
    return out


def rest_state(p: dict[str, float]) -> np.ndarray:
    s = calibrate(p)
    return np.array([s.xrest, s.urest, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])


def flow(p: dict[str, float], x: np.ndarray) -> np.ndarray:
    return (np.asarray(x) / p["xrest"]) ** 4


# ---------- Inputs: a small score of stress, breath, gasps and presses ----------


@dataclass
class Score:
    """Inputs over time: baseline tone (resting + stress), gasps (times), presses (start, end, mmHg), squeezes (start,
    end, deformation), paced breath, and the breath's movement at the knot."""

    duration: float
    stress: list[tuple[float, float]]  # (time, extra tone from then on)
    gasps: list[float]
    presses: list[tuple[float, float, float]]
    breath_period: float = 10.0  # 4 s in, 6 s out
    breathing: bool = False
    relaxing: bool = False  # the out-breath lowers drive and the in-breath does not raise it
    squeezes: list[tuple[float, float, float]] = field(default_factory=list)  # a press also deforms the tissue
    moving: bool = False  # the breath moves the tissue at the knot (rising on the in-breath)
    move: float | None = None  # how much, as a fraction of a squeeze that shuts the vessel (default breath_move)
    move_from: float = 0.0  # when the breath starts to move the tissue (s)
    settle: tuple[float, float, float] | None = None  # (start, time to settle, drop): drive eases and stays down

    def inputs(self, p: dict[str, float], dt: float) -> np.ndarray:
        s = calibrate(p)
        t = np.arange(0, self.duration, dt)
        u = np.full(len(t), s.urest)
        for t0, extra in self.stress:
            u[t >= t0] = s.urest + extra
        for tg in self.gasps:
            u += p.get("gasp_gain", s.gasp) * gasp_wave(t - tg, p)
        if self.breathing:
            w = breath_wave(t, self.breath_period)
            u += p["breath_swing"] * (np.minimum(w, 0) if self.relaxing else w)
        if self.settle:
            t0, span, drop = self.settle
            u -= drop * np.clip((t - t0) / span, 0, 1)
        pext = np.zeros(len(t))
        for a, b, mmhg in self.presses:
            pext[(t >= a) & (t < b)] = mmhg
        mv = np.zeros(len(t))
        for a, b, amount in self.squeezes:
            mv[(t >= a) & (t < b)] = amount
        if self.moving:
            amp = p["breath_move"] if self.move is None else self.move
            mv = np.maximum(mv, np.where(t >= self.move_from, amp * (1 + breath_wave(t, self.breath_period)) / 2, 0.0))
        return np.stack([np.clip(u, 0, 1), pext, mv], axis=1)


def gasp_wave(t: np.ndarray, p: dict[str, float]) -> np.ndarray:
    """A gasp's sympathetic drive, t seconds after the gasp: nothing for the reflex latency, then a brief burst."""
    t0 = t - p["latency"]
    return ((t0 >= 0) & (t0 < p["gasp_duration"])).astype(float)


def breath_wave(t: np.ndarray, period: float = 10.0, inhale: float = 4.0) -> np.ndarray:
    """+1 at the top of the in-breath, -1 at the end of the out-breath: 4 s in, 6 s out."""
    ph = np.mod(t, period)
    return np.where(ph < inhale, -np.cos(np.pi * ph / inhale), np.cos(np.pi * (ph - inhale) / (period - inhale)))


def run(p: dict[str, float], score: Score, dt: float = 0.01) -> dict[str, np.ndarray]:
    u = score.inputs(p, dt)
    y = rk4(p, u, dt)
    t = np.arange(len(u)) * dt
    return {"t": t, "uS": u[:, 0], "Pext": u[:, 1], "mv": u[:, 2], **{k: y[:, i] for i, k in enumerate(STATES)},
            "q": flow(p, y[:, 0])}


# ---------- Fitting the timing constants to their measured targets ----------

GASP_RECOVERY = 34.0  # s, mayrovitz2026 (one recording): flow back to baseline after a gasp


def gasp_response(p: dict[str, float], dt: float = 0.02) -> tuple[float, float, float]:
    """(lowest flow, when, recovery to 95%) after a gasp at rest; times from the gasp."""
    r = run(p, Score(duration=90, stress=[], gasps=[5.0], presses=[]), dt)
    q, t = r["q"], r["t"] - 5.0
    i = int(np.argmin(q))
    back = np.flatnonzero((t > t[i]) & (q >= 0.95))
    return float(q[i]), float(t[i]), float(t[back[0]]) if len(back) else float("inf")


def hyperaemia(p: dict[str, float], occlusion: float = 300.0, dt: float = 0.02) -> tuple[float, float]:
    """(peak rise above rest, time of peak after release) after an occlusion."""
    t0 = 10.0
    r = run(p, Score(duration=t0 + occlusion + 120, stress=[], gasps=[], presses=[(t0, t0 + occlusion, p["P"] + 40)]), dt)
    after = r["t"] >= t0 + occlusion
    j = int(np.argmax(np.where(after, r["q"], -np.inf)))
    return float(r["q"][j] - 1), float(r["t"][j] - t0 - occlusion)


@lru_cache(maxsize=64)
def fit(items: tuple[tuple[str, float], ...]) -> dict[str, float]:
    """Fit the gasp's size, how slowly nerve-driven tone fades, and how fast the sensory nerves act, so the model
    reproduces the measured fall and recovery of flow after a gasp (lau1995, mayrovitz2026) and the timing of
    reactive hyperaemia (alexandrou2021)."""
    from scipy.optimize import brentq

    p = dict(items)
    target_low = 1 - p["gasp_drop"]

    def solve(f, lo, hi, now):
        a, b = f(lo), f(hi)
        return brentq(f, lo, hi, xtol=1e-3) if a * b < 0 else now

    for _ in range(4):
        p["gasp_gain"] = solve(lambda G: gasp_response(p | {"gasp_gain": G})[0] - target_low, 0.02, 0.9, p.get("gasp_gain", 0.2))
        p["tau_down"] = solve(lambda td: gasp_response(p | {"tau_down": td})[2] - GASP_RECOVERY, 2.0, 30.0, p["tau_down"])
        p["tau_nerve"] = solve(lambda tn: hyperaemia(p | {"tau_nerve": tn})[1] - p["porh_peak_time"], 0.5, 15.0, p["tau_nerve"])
    return {k: p[k] for k in ("gasp_gain", "tau_down", "tau_nerve")}


# ---------- Fitting the movement route to squeezed arteries (clifford2006) ----------

SQUEEZES = {  # pressure pulses of 600 mmHg that close the lumen; (start, end) in s
    "one": [(5.0, 6.0)],
    "long": [(5.0, 10.0)],
    "five": [(5.0 + 2 * i, 6.0 + 2 * i) for i in range(5)],
}


def squeeze_response(p: dict[str, float], pulses: list[tuple[float, float]], dt: float = 0.02) -> tuple[float, float]:
    """(peak rise in diameter, seconds from the last release to the peak) after squeezing a vessel at rest shut."""
    end = pulses[-1][1]
    r = run(p, Score(duration=end + 20.0, stress=[], gasps=[], presses=[(a, b, 600.0) for a, b in pulses],
                     squeezes=[(a, b, 1.0) for a, b in pulses]), dt)
    j = int(np.argmax(np.where(r["t"] >= end, r["x"], -np.inf)))
    return float(r["x"][j] / p["xrest"] - 1), float(r["t"][j] - end)


@lru_cache(maxsize=64)
def fit_movement(items: tuple[tuple[str, float], ...]) -> dict[str, float]:
    """Fit how much each change of shape loosens the wall, how long it lasts and how fast it shows, so the model
    reproduces the widening of squeezed arteries and its timing after one squeeze, one long squeeze and five."""
    from scipy.optimize import least_squares

    from ..params import load

    p = dict(items)
    table = load("vessel")
    sem = lambda k: (table[k].range[1] - table[k].range[0]) / 2

    def resid(v):
        q = p | {"k_mv": v[0], "tau_w": v[1], "tau_z": v[2]}
        e = []
        for name in SQUEEZES:
            rise, when = squeeze_response(q, SQUEEZES[name])
            e += [(rise - p[f"squeeze_rise_{name}"]) / sem(f"squeeze_rise_{name}"),
                  (when - p[f"squeeze_peak_{name}"]) / sem(f"squeeze_peak_{name}")]
        return e

    best = least_squares(resid, x0=[p["k_mv"], p["tau_w"], p["tau_z"]], bounds=([0.1, 1.0, 0.2], [20.0, 60.0, 15.0]),
                         diff_step=0.05)
    return dict(zip(("k_mv", "tau_w", "tau_z"), (float(v) for v in best.x)))
