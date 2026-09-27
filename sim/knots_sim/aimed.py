"""A breath aimed at a place (route B6, the author's hypothesis): how precise would it have to be?

The author's hypothesis (27 Sep 2026): a precise, trained breath can lower the sympathetic signal at one chosen place and
so release a knot there, as in a body scan; how is not known. Sympathetic outflow runs in many tissue-specific channels
(morrison2001) and can go to skin and muscle in dissociated patterns (vissing1997); a suggestion can dilate one forearm's
vessels and not the rest (casiglia2006); learned finger warming is local but not sympathetic (freedman1991). Whether
anything can be aimed at a patch the size of a knot is not known. This asks what it would have to do.

It takes the matrix's patch (knots_sim/exam.py, PATCH: 64 places on a jittered grid, each with its share of the stress)
in each theory whose breath has a drive to aim (T1 and T3; in T6 the aimed variant is attention itself), in all 32
settings: knots formed by the surge and kept by the holding stress, then 30 broad slow breaths (the knots left are the
hard ones), then 30 breaths aimed at one knot still held (the one nearest the patch's middle). At distance r from it the
breath lowers drive g(r) = 1 + (G - 1) exp(-r^2 / 2 sigma^2) times as far as a broad breath, with G the setting's
focus_gain (guessed, 1.5-6). The width sigma is swept in grid spacings (for perforators, a spacing is a vessel's
neighbour distance, 4-5 mm: taylor1987, saintcyr2009); 0 is 30 more broad breaths, and "all" is the whole patch at G.

Per width, against the same breaths unaimed (width 0): does the aimed knot let go; how many other knots does the aim let
go besides (within 1.5 spacings; beyond); does the aimed knot let go with none besides; was it the first to go (a broad
breath takes the easiest knots first, so a chosen hard knot going first is the queue broken);
and, for T1, what a flow instrument would see while the breath is aimed: the flow (radius^4) of open vessels within 1.5
spacings and beyond 3, over one breath 20 s into the aimed breaths, against the breath before they began.

    uv run python -m knots_sim.aimed
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from . import exam
from .exam import PATCH, PERIOD, PREP, SURGE, T0

WIDTHS = (0.0, 0.25, 0.5, 1.0, 2.0, 4.0, np.inf)  # sigma, in grid spacings
SPACING = 1.0 / int(np.ceil(np.sqrt(PATCH["n"])))
NEAR, FAR = 1.5, 3.0  # in spacings


def _target(held: np.ndarray, K: int, N: int) -> np.ndarray:
    """Per set, the held place nearest the patch's middle (-1 if none)."""
    d = ((PATCH["pos"] - 0.5) ** 2).sum(axis=1)
    out = np.full(K, -1)
    for k in range(K):
        h = held[k * N:(k + 1) * N]
        if h.any():
            out[k] = int(np.argmin(np.where(h, d, np.inf)))
    return out


def _gain(G: np.ndarray, target: np.ndarray, sigma: float, K: int, N: int) -> np.ndarray:
    """g(r) per place: how many times as far the aimed breath lowers drive there."""
    g = np.ones(K * N)
    for k in range(K):
        if target[k] < 0 or sigma == 0:
            continue
        r = np.sqrt(((PATCH["pos"] - PATCH["pos"][target[k]]) ** 2).sum(axis=1)) / SPACING
        shape = np.ones(N) if np.isinf(sigma) else np.exp(-(r**2) / (2 * sigma**2))
        g[k * N:(k + 1) * N] = 1 + (G[k] - 1) * shape
    return g


def _rows(t: np.ndarray, held: np.ndarray, target: np.ndarray, K: int, N: int, flow=None) -> dict[int, dict]:
    """Per set with a target: which held knots let go in the aimed breaths (and when), and what a flow meter sees."""
    h0 = held[np.searchsorted(t, PREP) - 1]
    rows = {}
    for k in np.flatnonzero(target >= 0):
        sl = slice(k * N, (k + 1) * N)
        rel = np.full(N, np.inf)
        for i in np.flatnonzero(h0[sl]):
            off = np.flatnonzero((t >= PREP) & ~held[:, k * N + i])
            if len(off):
                rel[i] = t[off[0]] - PREP
        rows[int(k)] = {"held": h0[sl].copy(), "rel": rel} | (flow(k, target[k]) if flow else {})
    return rows


def _summary(rows: dict[int, dict], base: dict[int, dict], target: np.ndarray) -> dict:
    """Against the same breaths unaimed (sigma 0): the aimed knot let go; the others the aim let go besides (within
    NEAR spacings; beyond); the aimed knot let go and no other besides; it went before any other knot did."""
    out = {"settings": len(rows), "target": 0.0, "alone": 0.0, "first": 0.0, "near": 0.0, "far": 0.0}
    times = []
    for k, row in rows.items():
        j = target[k]
        r = np.sqrt(((PATCH["pos"] - PATCH["pos"][j]) ** 2).sum(axis=1)) / SPACING
        others = row["held"].copy()
        others[j] = False
        extra = others & np.isfinite(row["rel"]) & ~np.isfinite(base[k]["rel"])
        went = bool(np.isfinite(row["rel"][j]))
        out["target"] += went
        out["alone"] += went and not extra.any()
        out["first"] += went and (not others.any() or row["rel"][j] <= row["rel"][others].min())
        out["near"] += int((extra & (r <= NEAR)).sum())
        out["far"] += int((extra & (r > NEAR)).sum())
        if went:
            times.append(float(row["rel"][j]))
    n = max(len(rows), 1)
    out = {k: (v / n if k != "settings" else v) for k, v in out.items()}
    out["median_s"] = float(np.median(times)) if times else None
    out["held_others"] = float(np.mean([row["held"].sum() - 1 for row in rows.values()])) if rows else 0.0
    for key in ("flow_near", "flow_far"):
        vals = [row[key] for row in rows.values() if key in row and row[key] == row[key]]
        if vals:
            out[key] = float(np.median(vals))
    return out


def _sweep(run_width, target: np.ndarray) -> dict:
    rows = {_label(s): run_width(s) for s in WIDTHS}
    base = rows[_label(0.0)]
    return {w: _summary(r, base, target) for w, r in rows.items()}


def t1(ps: list[dict]) -> dict:
    from .theories import t1 as th

    S = th._patch_setup(ps)
    K, N = S["K"], S["N"]
    urest, zone = S["urest"], S["zone"]
    U = np.repeat(th.units(ps), N)
    vec = lambda key: th._vec(ps, key, N)
    held_tone = urest + U * vec("hold") * zone
    fall, calm_by, calm_tau, in_share = vec("breath_fall") * U, vec("breath_calm") * U, vec("tau_calm"), vec("breath_in_share")
    zeros = np.zeros(K * N)
    G = np.array([p["focus_gain"] for p in ps])

    def run(gain: np.ndarray | None, duration: float) -> dict:
        def inputs(t):
            if t < SURGE[0]:
                return urest, zeros, zeros
            if t < SURGE[1]:
                return np.clip(urest + U * zone, 0, 1), zeros, zeros
            if t < T0:
                return np.clip(held_tone, 0, 1), zeros, zeros
            at = gain if (gain is not None and t - T0 >= PREP) else 1.0
            du, _ = th._breath(t - T0, True, False, fall * at, in_share, zeros, calm_by * at, calm_tau)
            return np.clip(held_tone + du, 0, 1), zeros, zeros

        return th._run(S["pars"], urest, inputs, T0 + duration, keep_n=False)

    broad = run(None, PREP + 1.0)
    shut = (broad["x"] < th.SHUT * S["pars"]["xc"]) & S["bist"]
    target = _target(shut[-1], K, N)
    def width(sigma):
        r = run(_gain(G, target, sigma, K, N), 2 * PREP)
        t = r["t"] - T0
        x = r["x"].astype(float)
        held = (x < th.SHUT * S["pars"]["xc"]) & S["bist"]
        before = (t >= PREP - PERIOD) & (t < PREP)
        during = (t >= PREP + 20.0) & (t < PREP + 20.0 + PERIOD)

        def flow(k, j):
            sl = slice(k * N, (k + 1) * N)
            rr = np.sqrt(((PATCH["pos"] - PATCH["pos"][j]) ** 2).sum(axis=1)) / SPACING
            open_ = ~held[before][:, sl].any(axis=0) & ~held[during][:, sl].any(axis=0)
            q0, q1 = (x[before][:, sl] ** 4).mean(axis=0), (x[during][:, sl] ** 4).mean(axis=0)
            ratio = lambda m: float(q1[m].sum() / q0[m].sum() - 1) if m.any() else float("nan")
            return {"flow_near": ratio(open_ & (rr <= NEAR) & (np.arange(N) != j)), "flow_far": ratio(open_ & (rr > FAR))}

        return _rows(t, held, target, K, N, flow)

    return _sweep(width, target)


def t3(ps: list[dict]) -> dict:
    from .models import triggerpoint as tp
    from .theories import t3 as th

    S = th._setup(ps)
    K, N, P, zone = S["K"], S["N"], S["P"], S["zone"]
    n = K * N
    st0 = th._form(S)
    G = np.array([p["focus_gain"] for p in ps])

    def run(gain: np.ndarray | None, duration: float, st) -> dict:
        def inputs(t, st_):
            at = gain if (gain is not None and t >= PREP) else 1.0
            ds, _ = th._breath(t, False, P, 1.0, at)
            return (P["hold"] + ds) * zone, np.zeros(n), np.zeros(n), np.ones(n)

        return tp.simulate(P, S["a0"], inputs, duration, dt=0.05, every=4, state=st)

    broad = run(None, PREP + 1.0, _copy(st0))
    target = _target(broad["c"][-1] > tp.HELD, K, N)
    def width(sigma):
        r = run(_gain(G, target, sigma, K, N), 2 * PREP, _copy(st0))
        return _rows(r["t"], r["c"] > tp.HELD, target, K, N)

    return _sweep(width, target)


def _copy(st):
    from copy import deepcopy

    return deepcopy(st)


def _label(sigma: float) -> str:
    return "all" if np.isinf(sigma) else f"{sigma:g}"


def study(k: int = exam.K, seed: int = exam.SEED) -> dict:
    from .theories import t1 as th1
    from .theories import t3 as th3

    return {"widths": [_label(s) for s in WIDTHS], "spacing_mm": [4, 5], "near": NEAR, "far": FAR,
            "T1": t1(th1.sample(k, seed)), "T3": t3(th3.sample(k, seed))}


def inputs_hash() -> str:
    """The exam's inputs (the theories, their models and parameters) and this file: aimed.json carries it; a test fails
    when it is stale."""
    import hashlib

    return hashlib.sha256((exam.inputs_hash() + Path(__file__).read_text()).encode()).hexdigest()[:12]


SITE = exam.SITE.parent / "aimed.json"


def main(k: int = exam.K) -> dict:
    from .export import _git

    out = {"run": {"inputs": inputs_hash(), **_git()}, "samples": k, **study(k)}
    SITE.write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False) + "\n")
    return out


if __name__ == "__main__":
    import sys

    res = main(int(sys.argv[1]) if len(sys.argv) > 1 else exam.K)
    for th in ("T1", "T3"):
        print(th)
        for w, row in res[th].items():
            print(f"  sigma {w:>4}: " + "  ".join(f"{k} {v:.3g}" if isinstance(v, float) else f"{k} {v}" for k, v in row.items()))
