"""T1, perforators, through the exam (knots_sim/exam.py).

The unit is the vessel switch (models/vessel.py): a perforator's small artery held shut by its own wall. Clusters use
the tree (models/tree.py); age uses length adaptation (adapt.py). How the shared trials map onto the vessel, to be
checked for fairness:

- Stress (the shared unit: 1 is a surge that forms knots) is extra tone command, U per unit, times each place's share.
  U is set by the shared rule (knots_sim/exam.py): the typical place whose vessel can hold a knot sits in the middle
  of its window. A single knot of depth d holds at tone Aopen + d (Afold - Aopen): d is where it sits in its own band.
- A slow breath acts by the variant's route. Through drive: the out-breath lowers the tone command by breath_fall
  (U per unit) and the in-breath raises it by breath_in_share of that. Through movement: each breath deforms the
  tissue at the knot by breath_strain (the movement route, fitted to squeezed arteries).
- Focused attention works through the breath's route at that place: the movement there is focus_gain times larger.
  Drive is not local, so through drive alone focus changes nothing. In the aimed variant (route B6, the author's
  hypothesis: a trained breath lowers the sympathetic signal at one chosen place), attention aims the drive: at the
  attended place the breath lowers tone focus_gain times as far.
- A press is palpation pressure outside the vessel, and a change of shape (press_strain) as the hand lands and lifts.
- The sensation is the burst of the vessel's own sensory nerve (state n) as blood returns: confined to its own patch by
  construction.
- The switch's own parameters are sampled across their ranges; the fitted timings (the gasp, tone's easing, the nerve,
  the movement route) stay at their fitted values.
"""

from __future__ import annotations

import numpy as np

from .. import adapt
from ..exam import (AGE_DEPTH, BACK_WITHIN, MOOD_FOR, PATCH, PERIOD, PRESS_FOR, ROUTES, SURGE, T0, WITHIN, AgeOut, ClusterOut, Density, Patch, PatchOut, Single,
                    SingleOut, breath_wave, calm, coming_and_going, held_again, mood, out_breath, releases)
from ..models import tree as tr
from ..models import vessel as v
from ..models.tree import _rhs
from ..params import load, values

ID, NAME = "T1", "Perforators"
VARIANTS = {
    "drive": "the breath acts through sympathetic drive to the skin's small arteries",
    "movement": "the breath acts through the tissue's movement at the knot",
    "both": "through drive and movement together",
    "aimed": "through sympathetic drive, aimed by attention: at the attended place it falls focus_gain times as far",
    "both+adaptation": "both, with the muscle adapting to a held length over hours (knots can set)",
}
SILENT = {"O3"}
NOTES = {"O3": "Nothing in the vessel switch turns on hydration.",
         "O15": "Small vessels rise to the skin on the order of 100,000, one every 4-5 mm (estimated from the skin's area); the major ones, 374 on average (taylor1987).",
         "O1.3": "Through drive alone the breath is not local, so focusing it changes nothing; through movement, focus concentrates the movement at the place; aimed, it lowers the drive there.",
         "O2.2": "Pressed, the vessel is squeezed and cannot open: it lets go within a second of the hand lifting, not under it.",
         "O8.1": "A release lowers the pressure its siblings share, by several mmHg, but not enough to shut one; a neighbour shuts only if something else pushes on it by 10 mmHg or more (exploratory/2026-09-27-migration-pressure.py), where tissue pressure under the skin rises only a few mmHg as it fills (christ1997).",
         "O10.1": "Without adaptation nothing remembers how long a knot was held; with it, a knot held for hours can set and hold at rest (findings 003)."}
SHUT = 1.5
VARY = ("Tmax", "r100", "P", "xopt", "beta", "width", "wall", "xc")
_CACHE: dict = {}


def sample(n: int, seed: int) -> list[dict]:
    from scipy.stats import qmc

    tables = load("vessel") | load("interface") | load("adapt")
    keys = VARY + tuple(values("interface")) + ("tau_adapt", "adapt_share")
    X = qmc.scale(qmc.Sobol(len(keys), seed=seed).random(n), [tables[k].range[0] for k in keys],
                  [tables[k].range[1] for k in keys])
    base = v.params() | values("adapt")
    out = []
    for i, x in enumerate(X):
        p = base | dict(zip(keys, map(float, x))) | {"seed": seed * 1000 + i}
        p["xrest"] = v.calibrate(p | {"lo": 1.0}).xrest
        out.append(p)
    return out


def _base(variant: str) -> str:
    return variant.replace("+adaptation", "")


def _vec(ps: list[dict], key: str, repeat: int = 1) -> np.ndarray:
    return np.repeat(np.array([p[key] for p in ps], float), repeat)


def _pars(rep: list[dict]) -> dict[str, np.ndarray]:
    return {k: np.array([p.get(k, v.DEFAULTS.get(k, 0.0)) for p in rep], float) for k in v.PARAMS}


def _run(pars: dict, urest: np.ndarray, inputs, duration: float, dt: float = 0.02, every: int = 10,
         keep_n: bool = True) -> dict:
    """Integrate many independent vessels at once (RK4, inputs held over each step); record radius and nerve."""
    f = _rhs()
    n = len(urest)
    pv = tuple(pars[k] for k in v.PARAMS)
    xc = pars["xc"]
    Y = np.zeros((len(v.STATES), n))
    Y[0], Y[1] = pars["xrest"], urest

    def F(Y, u):
        return np.array([np.broadcast_to(d, (n,)) for d in f(tuple(Y), u, pv)], dtype=float)

    ts, xs, ns = [], [], []
    for i in range(int(round(duration / dt))):
        t = i * dt
        if i % every == 0:
            ts.append(t)
            xs.append(Y[0].astype(np.float32))
            if keep_n:
                ns.append(Y[3].astype(np.float32))
        u = inputs(t)
        k1 = F(Y, u)
        k2 = F(Y + dt / 2 * k1, u)
        k3 = F(Y + dt / 2 * k2, u)
        k4 = F(Y + dt * k3, u)
        Y = Y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        Y[0] = np.maximum(Y[0], xc)
        Y[1:] = np.clip(Y[1:], 0.0, 1.0)
    return {"t": np.array(ts), "x": np.array(xs), "n": np.array(ns) if keep_n else None}


def _breath(t: float, drive: bool, move: bool, fall, in_share, strain, calm_by=0.0, calm_tau=1.0):
    """What a slow breath does at time t (s since breathing began): (change of tone command, deformation). Through
    drive, each out-breath eases tone and the in-breath raises it again, while minutes of it calm (calm_by, in tone)."""
    w = float(breath_wave(np.array([t]))[0])
    du = fall * (in_share * max(w, 0.0) + min(w, 0.0)) - calm(t, calm_by, calm_tau) if drive else 0.0
    mv = strain * (1 + w) / 2 if move else 0.0
    return du, mv


# ---------- A single held knot ----------


def single(ps: list[dict], variant: str, depths: tuple, protocol: Single) -> SingleOut:
    key = ("single", id(ps), _base(variant), protocol, depths)
    if key in _CACHE:
        return _CACHE[key]
    K, D = len(ps), len(depths)
    rep = [p for p in ps for _ in depths]
    cal = [v.calibrate(p) for p in ps]
    urest = np.repeat([c.urest for c in cal], D)
    Aopen, Afold = np.repeat([c.Aopen for c in cal], D), np.repeat([c.Afold for c in cal], D)
    hold = Aopen + np.tile(depths, K) * (Afold - Aopen)
    fall = _vec(ps, "breath_fall", D) * np.repeat(units(ps), D)
    calm_by, calm_tau = _vec(ps, "breath_calm", D) * np.repeat(units(ps), D), _vec(ps, "tau_calm", D)
    in_share, strain = _vec(ps, "breath_in_share", D), _vec(ps, "breath_strain", D)
    focus = _vec(ps, "focus_gain", D) if protocol.focus else 1.0
    palp, press_strain = _vec(ps, "palpation", D), _vec(ps, "press_strain", D)
    base = _base(variant)
    drive, move = base in ("drive", "both", "aimed"), base in ("movement", "both")
    aimed = focus if base == "aimed" else 1.0  # how much further the drive falls where attention aims it
    zeros = np.zeros(K * D)

    def inputs(t):
        if t < SURGE[0]:
            return urest, zeros, zeros
        if t < SURGE[1]:
            return np.clip(Afold + 0.03, 0, 1), zeros, zeros
        if t < T0:
            return hold, zeros, zeros
        du, mv = _breath(t - T0, drive, move, fall * aimed, in_share, strain * focus, calm_by * aimed, calm_tau)
        pe = zeros
        if protocol.press and t - T0 < protocol.press_for:
            pe, mv = palp, np.maximum(mv, press_strain)
        return np.clip(hold + du, 0, 1), pe, np.clip(mv + zeros, 0, 1)

    r = _run(_pars(rep), urest, inputs, T0 + protocol.breaths * PERIOD + WITHIN)
    t = r["t"] - T0
    shut = r["x"] < SHUT * _pars(rep)["xc"]
    bist = np.repeat([c.bistable for c in cal], D)
    formed = shut[np.searchsorted(t, 0.0) - 1] & bist
    rel = np.full(K * D, np.nan)
    here = np.full(K * D, np.nan)
    for j in np.flatnonzero(formed):
        after = np.flatnonzero((t >= 0) & (t < protocol.breaths * PERIOD) & ~shut[:, j])
        if len(after):
            rel[j] = t[after[0]]
            win = (t >= rel[j]) & (t <= rel[j] + WITHIN)
            here[j] = r["n"][win, j].max()
    shape = (K, D)
    out = SingleOut(formed=formed.reshape(shape), rel_t=rel.reshape(shape),
                    during_out=np.where(np.isnan(rel), False, out_breath(np.nan_to_num(rel))).reshape(shape),
                    pressed=(protocol.press & (np.nan_to_num(rel, nan=np.inf) < protocol.press_for)).reshape(shape),
                    spark_here=here.reshape(shape), spark_far=np.zeros(shape))
    _CACHE[key] = out
    return out


# ---------- A patch of knots ----------


def _patch_setup(ps: list[dict]) -> dict:
    """Each place its own wall (across the plausible range), in every set; calibrated once."""
    if ("setup", id(ps)) in _CACHE:
        return _CACHE[("setup", id(ps))]
    N = PATCH["n"]
    walls = np.random.default_rng(7).uniform(*load("vessel")["wall"].range, N)
    rep = [p | {"wall": float(w)} for p in ps for w in walls]
    for q in rep:
        q["xrest"] = v.calibrate(q | {"lo": 1.0}).xrest
    cal = [v.calibrate(q) for q in rep]
    s = {"rep": rep, "pars": _pars(rep), "urest": np.array([c.urest for c in cal]),
         "Aopen": np.array([c.Aopen for c in cal]), "Afold": np.array([c.Afold for c in cal]),
         "bist": np.array([c.bistable for c in cal]), "zone": np.tile(PATCH["zone"], len(ps)),
         "near": np.tile(PATCH["near"], len(ps)), "K": len(ps), "N": N}
    _CACHE[("setup", id(ps))] = s
    return s


def units(ps: list[dict]) -> np.ndarray:
    """Tone command per unit of the shared stress, per set, by the shared rule: at the typical place whose vessel can
    hold a knot (the median over the patch's walls), a surge (U) shuts it, the holding stress (hold U) keeps it shut
    and cannot shut it alone. U sits in the middle (geometric) of that window."""
    if ("units", id(ps)) in _CACHE:
        return _CACHE[("units", id(ps))]
    S = _patch_setup(ps)
    K, N = S["K"], S["N"]
    out = np.full(K, 0.8)
    for k, p in enumerate(ps):
        sl = slice(k * N, (k + 1) * N)
        ur, Ao, Af, ok = S["urest"][sl], S["Aopen"][sl], S["Afold"][sl], S["bist"][sl]
        lo = np.maximum(Af - ur, (Ao - ur) / p["hold"])
        hi = np.minimum((Af - ur) / p["hold"], 1 - ur)
        can = ok & (Af > ur) & (lo < hi)
        if can.any():
            out[k] = float(np.median(np.sqrt(lo[can] * hi[can])))
    _CACHE[("units", id(ps))] = out
    return out


def patch(ps: list[dict], variant: str, protocol: Patch) -> PatchOut:
    key = ("patch", id(ps), _base(variant), protocol)
    if key in _CACHE:
        return _CACHE[key]
    S = _patch_setup(ps)
    K, N = S["K"], S["N"]
    urest, zone, near = S["urest"], S["zone"], S["near"]
    U = np.repeat(units(ps), N)
    hold_s = _vec(ps, "hold", N) * protocol.stress
    fall = _vec(ps, "breath_fall", N) * U
    calm_by, calm_tau = _vec(ps, "breath_calm", N) * U, _vec(ps, "tau_calm", N)
    in_share, strain = _vec(ps, "breath_in_share", N), _vec(ps, "breath_strain", N)
    focus = np.where(near, _vec(ps, "focus_gain", N), 1.0)
    palp, press_strain = _vec(ps, "palpation", N), _vec(ps, "press_strain", N)
    base = _base(variant)
    drive, move = base in ("drive", "both", "aimed"), base in ("movement", "both")
    aimed = focus if base == "aimed" else 1.0
    zeros = np.zeros(K * N)
    kind = protocol.kind
    held_tone = urest + U * hold_s * zone
    hold_base = _vec(ps, "hold", N)
    if kind == "mood":
        mt = [mood(p["mood_sd"], p["mood_tau"], p["seed"]) for p in ps]
        mgrid = mt[0][0]
        mvals = np.repeat(np.array([m for _, m in mt]), N, axis=0)  # (K*N, len)

    def inputs(t):
        if kind == "mood":
            i = min(int(t), len(mgrid) - 1)
            u = urest + U * (hold_base + mvals[:, i]) * zone
            du, mv = _breath(t, drive, move, fall, in_share, strain, calm_by, calm_tau)
            return np.clip(u + du, 0, 1), zeros, np.clip(mv + zeros, 0, 1)
        if t < SURGE[0]:
            return urest, zeros, zeros
        if t < SURGE[1]:
            return np.clip(urest + U * zone, 0, 1), zeros, zeros
        if t < T0:
            return np.clip(held_tone, 0, 1), zeros, zeros
        breathing, local, pressing = protocol.at(t - T0)
        if not breathing:
            return np.clip(held_tone, 0, 1), zeros, zeros
        at = aimed if local else 1.0
        du, mv = _breath(t - T0, drive, move, fall * at, in_share, strain * (focus if local else 1.0), calm_by * at,
                         calm_tau)
        pe = zeros
        if pressing:
            pe = np.where(near, palp, 0.0)
            mv = np.maximum(mv, np.where(near, press_strain, 0.0))
        return np.clip(held_tone + du, 0, 1), pe, np.clip(mv + zeros, 0, 1)

    if kind == "mood":
        r = _run(S["pars"], urest, inputs, MOOD_FOR, dt=0.05, every=20, keep_n=False)
    elif kind == "hold":
        r = _run(S["pars"], urest, inputs, T0 + protocol.duration, dt=0.05, every=20, keep_n=False)
    else:
        r = _run(S["pars"], urest, inputs, T0 + protocol.duration, keep_n=False)
    shut = (r["x"] < SHUT * S["pars"]["xc"]) & S["bist"]
    t = r["t"]
    held0s, rels, cycles, shortest = [], [], [], []
    if kind == "mood":
        for k in range(K):
            cyc, best = coming_and_going(t, shut[:, k * N:(k + 1) * N])
            cycles.append(cyc)
            shortest.append(best)
            held0s.append(np.zeros(N, bool))
            rels.append(np.full(N, np.nan))
        out = PatchOut(held0s, rels, cycles, shortest)
    else:
        start = T0 + (protocol.duration if kind == "hold" else protocol.start)
        held, rel = releases(t, shut, start)
        for k in range(K):
            held0s.append(held[k * N:(k + 1) * N])
            rels.append(rel[k * N:(k + 1) * N])
        out = PatchOut(held0s, rels)
    _CACHE[key] = out
    return out


# ---------- Clusters: a parent and its children; siblings on a feed ----------


def _trees(ps: list[dict], walls: np.ndarray, rigid: bool) -> dict:
    """One tree per set (its own switch parameters), stacked so they run together."""
    tv = values("tree")
    trees = [tr.build(walls[None, :], tv["P_source"], tv["P_bed"], tv["ratio"], rigid_parent=rigid, base=p) for p in ps]
    T0_ = trees[0]
    out = {k: T0_[k] for k in ("V", "K", "rigid")}
    out["T"] = len(ps)
    for k in ("Ps", "Pv", "R", "urest", "Aopen", "Afold"):
        out[k] = np.concatenate([t_[k] for t_ in trees])
    out["pars"] = {k: np.concatenate([t_["pars"][k] for t_ in trees]) for k in T0_["pars"]}
    out["xc"] = np.array([p["xc"] for p in ps])[:, None]
    return out


def cluster(ps: list[dict], variant: str) -> ClusterOut:
    key = ("cluster", id(ps), _base(variant))
    if key in _CACHE:
        return _CACHE[key]
    K = len(ps)
    U = units(ps)
    hold = np.array([p["hold"] for p in ps])
    palp = np.array([p["palpation"] for p in ps])
    strain = np.array([p["press_strain"] for p in ps])
    wall_range = load("vessel")["wall"].range
    press = (T0, T0 + PRESS_FOR)
    base = _base(variant)
    drive, move = base in ("drive", "both", "aimed"), base in ("movement", "both")
    B = {k: np.array([p[k] for p in ps])[:, None] for k in ("breath_fall", "breath_in_share", "breath_strain",
                                                              "breath_calm", "tau_calm", "focus_gain")}

    def run_tree(tree, target, duration):
        u_m = tree["urest"] + (U * hold)[:, None]
        gain = np.ones(u_m.shape)
        gain[:, target] = B["focus_gain"][:, 0]  # attention at the worked knot
        aimed = gain if base == "aimed" else 1.0
        gone = np.zeros(len(ps), bool)  # the knot has let go: the hand lifts, and does not come back

        def inputs(t, x):
            u = tree["urest"].copy() if t < SURGE[0] else u_m.copy()
            pe = np.zeros(u.shape)
            mv = np.zeros(u.shape)
            if SURGE[0] <= t < SURGE[1]:
                u[:, target] = np.clip(tree["urest"][:, target] + U, 0, 1)
            if t >= press[0]:  # the knot is worked: pressed, attended, with slow breaths
                du, mv = _breath(t - press[0], drive, move, B["breath_fall"] * U[:, None] * aimed, B["breath_in_share"],
                                 B["breath_strain"] * gain, B["breath_calm"] * U[:, None] * aimed, B["tau_calm"])
                u = u + du
                mv = mv + np.zeros(u.shape)
            if t >= press[0]:
                gone[:] |= x[:, target] >= SHUT * tree["xc"][:, 0]
            if press[0] <= t < press[1]:  # worked until it lets go, for at most a minute
                pe[:, target] = np.where(gone, 0.0, palp)
                mv[:, target] = np.where(gone, mv[:, target], np.maximum(mv[:, target], strain))
            return np.clip(u, 0, 1), pe, np.clip(mv, 0, 1)

        return tr.run(tree, inputs, duration, dt=0.02, every=10, sees=True)

    # O8.2, per set: within BACK_WITHIN s of the knot's release, a knot back at its place, by route, and how soon
    how = {r_: np.zeros(K, bool) for r_ in ROUTES}
    first = np.full(K, np.inf)

    def came_back(k, route, times):
        if len(times):
            how[route][k] = True
            first[k] = min(first[k], float(times[0]))

    # A parent and four children: release the parent; how many children go with it, within 10 s? And after it: is the
    # parent shut again, or is a child still (or again) shut beneath it?
    parent = _trees(ps, np.array([0.30] + list(np.linspace(*wall_range, 4))), rigid=False)
    r = run_tree(parent, 0, press[1] + BACK_WITHIN + 10.0)
    s = r["x"] < SHUT * parent["xc"][None]
    t = r["t"]
    before = s[np.searchsorted(t, press[0]) - 1]
    with_ = np.zeros(K, int)
    tested_with = np.zeros(K, bool)
    for k in range(K):
        if not before[k, 0]:
            continue
        opened = np.flatnonzero((t >= press[0]) & ~s[:, k, 0])
        if not len(opened):
            continue
        tested_with[k] = True
        t_open = t[opened[0]]
        win = s[(t >= t_open) & (t <= t_open + 10.0), k, 1:]
        with_[k] = int((before[k, 1:] & ~win[-1]).sum())
        came_back(k, "same", held_again(t, s[:, k, 0], t_open))
        settled = (t >= t_open + 10.0) & (t <= t_open + BACK_WITHIN)  # the children have had 10 s to open with it
        came_back(k, "beneath", t[settled][s[settled, k, 1:].any(axis=1)] - t_open)
    # Siblings on a feed: release one; does a neighbour shut within 10 minutes? The knot is the thickest-walled sibling
    # (0.30, as for the parent), the one most able to hold; the rest are its neighbours.
    sib = _trees(ps, np.array([0.30] + list(np.linspace(*wall_range, 6))), rigid=True)
    knot = sib["V"] - 1
    near = list(range(1, knot))
    r2 = run_tree(sib, knot, press[1] + BACK_WITHIN + 10.0)
    s2 = r2["x"] < SHUT * sib["xc"][None]
    t2 = r2["t"]
    before2 = s2[np.searchsorted(t2, press[0]) - 1]
    new = np.zeros(K, bool)
    tested_new = np.zeros(K, bool)
    for k in range(K):
        if not before2[k, knot]:
            continue
        opened = np.flatnonzero((t2 >= press[0]) & ~s2[:, k, knot])
        if not len(opened):
            continue
        tested_new[k] = True
        t_open = t2[opened[0]]
        window = (t2 >= t_open) & (t2 <= t_open + BACK_WITHIN)
        later = s2[window, k][:, near]
        newly = ~before2[k, near] & later.any(axis=0)
        new[k] = bool(newly.any())
        came_back(k, "same", held_again(t2, s2[:, k, knot], t_open))
        came_back(k, "beside", t2[window][(later & ~before2[k, near]).any(axis=1)] - t_open)
    back = how["same"] | how["beneath"] | how["beside"]
    out = ClusterOut(with_=with_, new_nearby=new, tested_with=tested_with, tested_new=tested_new, back=back,
                     back_how=how, back_t=np.where(np.isfinite(first), first, np.nan),
                     tested_back=tested_with | tested_new)
    _CACHE[key] = out
    return out


# ---------- Age: a knot held briefly, and one held for hours ----------


def ageing(ps: list[dict], variant: str) -> AgeOut:
    brief, long = np.zeros(len(ps), bool), np.zeros(len(ps), bool)
    for k, p in enumerate(ps):
        c = v.calibrate(p)
        if not c.bistable:
            continue
        S = c.Aopen + AGE_DEPTH * (c.Afold - c.Aopen)  # held by its stress a third of the way up its band
        if "adaptation" in variant:
            q = adapt.params(fitted=False, **{k_: p[k_] for k_ in VARY + ("tau_adapt", "adapt_share")})
            V = adapt.Vessel(q)
            brief[k] = not adapt.held(q, S, 0.5 * adapt.HOUR, after_h=1.0, ves=V)["stays"]
            long[k] = adapt.held(q, S, 3.0 * adapt.HOUR, after_h=1.0, ves=V)["stays"]
        else:
            brief[k] = c.Aopen > c.urest
            long[k] = c.Aopen < c.urest
    return AgeOut(brief_released=brief, long_persists=long)


def density() -> Density:
    return Density(per_mm2=1 / 4.5**2, total=1e5, note=NOTES["O15"])
