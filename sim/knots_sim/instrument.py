"""What an instrument would record, under each modelled theory: the measurement, designed from the models.

The plan's keystone recording and its pilot (PLAN.md §6): over a knot and over sham sites, with the breath and a button
at each felt release. This takes the exam's own patch trials (knots_sim/exam.py `Patch`: knots formed by the surge and
held; then 30 slow breaths everywhere; or, after them, a press at the spot with attention; or a focused breath there), in
every setting of each modelled theory, and listens to each theory's run as the trial makes it: nothing here simulates a
trial of its own. The first knot at the spot to let go (anywhere, under broad breaths) is the recording site. Two shams:
the places under the same hand that held no knot (a pressed sham), and open places more than FAR spacings away. Each
theory's state is read as an instrument would read it:

- Skin perfusion by laser speckle, which sees the skin's superficial, nutritional supply (odoherty2009). A perforator's
  flow is its radius to the fourth power, relative to its relaxed radius (Poiseuille). A region the size of its patch
  (patch_mm) sees its own vessel's share of the patch's flow (own_share, guessed: each perforasome is linked to its
  neighbours, saintcyr2009) and its neighbours' for the rest. In the trigger-point and perception models nothing in the
  skin changes.
- The nodule: a trigger point's contracture (elastography, taking stiffness to follow it: guessed) and its capillary
  flow as its model has it (Doppler ultrasound at the nidus).
- What is felt: perception's felt intensity, for timing only. Nothing in its tissue changes.
- Single motor units, by surface EMG that picks them out (the motor switch): whether the knot's unit fires, and the share
  of units firing at the shams. A unit's firing is its knot, in that model, so what it adds is the timing and the shams.

What it asks of each reading: before any release, does the knot's patch differ from its neighbours'? At a press and its
lift, how does the knot's site change from before the press to after the lift, beside a pressed site that held no knot
(a press squeezes every vessel under the hand, so flow returns at the lift wherever it pressed)? At a release by broad
breaths, how does the knot's site jump against the far sham? And how many knots or releases would show it: the
difference against laser speckle's variability (roustit2010, 8-15% week to week, which over-states the noise within one
session), a paired comparison at 5% and 80% power, never fewer than three.

    uv run python -m knots_sim.instrument
"""

from __future__ import annotations

import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import numpy as np

from . import exam
from .exam import PATCH, PRESS_FOR, T0, Patch
from .params import values

SPACING = 1.0 / int(np.ceil(np.sqrt(PATCH["n"])))
NEAR, FAR = 1.5, 3.0  # in spacings: a knot's neighbours; the far sham
OWN = (0.3, 0.6, 1.0)  # own_share: its range and its middle
ROI_MM = (0.0, 10.0, 20.0)  # a region the size of the patch (0), 1 cm and 2 cm across
BEFORE, AFTER = (-10.0, -1.0), (5.0, 15.0)  # s around an event: the windows compared
TRACE = (-20.0, 100.0)  # s around the press's start: the trace drawn
Z = 1.959964 + 0.841621  # two-sided 5%, power 80%
RUNS = {"T1": ("t1", ("drive", "movement", "aimed")), "T3": ("t3", ("drive", "drive+stretch", "aimed")),
        "T6": ("t6", ("arousal",)), "T7": ("t7", ("inhibit", "excite"))}
KINDS = ("press", "broad", "focused")


@contextmanager
def _listening(module, name: str):
    """Keep every result of module.name (a theory's own simulator) while its trial runs; the trial is unchanged."""
    runs = []
    original = getattr(module, name)

    def heard(*a, **kw):
        r = original(*a, **kw)
        runs.append(r)
        return r

    setattr(module, name, heard)
    try:
        yield runs
    finally:
        setattr(module, name, original)


def record(tid: str, variant: str, kind: str) -> dict:
    """The exam's patch trial for one theory, variant and protocol, and its own run: time (s from the trial's start),
    the readings per place, and which places hold."""
    name = RUNS[tid][0]
    th = exam._theory(name)
    ps = th.sample(exam.K, exam.SEED)
    protocol = Patch(kind)
    if tid == "T1":
        with _listening(th, "_run") as runs:
            out = th.patch(ps, variant, protocol)
        S = th._patch_setup(ps)
        x = runs[-1]["x"].astype(float)
        reading = {"skin": (x / S["pars"]["xrest"]) ** 4}
        held, tau = (x < th.SHUT * S["pars"]["xc"]) & S["bist"], runs[-1]["t"] - T0
    elif tid == "T3":
        with _listening(th.tp, "simulate") as runs:
            out = th.patch(ps, variant, protocol)
        r = runs[-1]
        reading = {"stiffness": r["c"].astype(float), "nidus_flow": r["q"].astype(float)}
        held, tau = r["c"] > th.tp.HELD, r["t"]
    elif tid == "T7":
        with _listening(th.ms, "simulate") as runs:
            out = th.patch(ps, variant, protocol)
        r = runs[-1]
        reading = {"firing": r["on"].astype(float)}
        held, tau = r["knot"], r["t"]
    else:
        with _listening(th, "simulate") as runs:
            out = th.patch(ps, variant, protocol)
        r = runs[-1]
        reading = {"felt": r["F"].astype(float)}
        held, tau = r["h"], r["t"]
    return {"tau": tau, "reading": reading, "held": held, "out": out, "K": len(ps), "N": PATCH["n"],
            "start": protocol.start, "kind": kind}


def _sites(rec: dict) -> list[dict]:
    """Per set, the recording site (the first knot at the spot to let go; anywhere under broad breaths) and its shams."""
    K, N, tau = rec["K"], rec["N"], rec["tau"]
    pos, near = PATCH["pos"], PATCH["near"]
    out = []
    for k in range(K):
        held0, rel = rec["out"].held0[k], rec["out"].rel_t[k]
        cand = held0 & np.isfinite(rel) & (near if rec["kind"] != "broad" else True)
        if not cand.any():
            continue
        j = int(np.flatnonzero(cand)[np.argmin(rel[cand])])
        t_rel = rec["start"] + rel[j]
        if t_rel + AFTER[1] > tau[-1]:
            continue
        d = np.sqrt(((pos - pos[j]) ** 2).sum(axis=1)) / SPACING
        held = rec["held"][:, k * N:(k + 1) * N]
        never = ~held.any(axis=0)  # open throughout the trial
        # open when the breaths began and when the press (or the focus) began: no knot, though a press may squeeze it
        was_open = ~held0 & ~held[max(int(np.searchsorted(tau, 0.0)), 0)] & (np.arange(N) != j)
        far = never & (d > FAR)
        if not far.any():
            continue
        ring = was_open & (d <= NEAR)
        if rec["kind"] == "press":  # under a press, its neighbours under the same hand: a press flushes all it presses
            ring = ring & near if (ring & near).any() else near & was_open
        out.append({"k": k, "j": j, "t": float(t_rel), "far": np.flatnonzero(far),
                    "pressed": np.flatnonzero(near & was_open), "ring": np.flatnonzero(ring)})
    return out


def _mean(y: np.ndarray, tau: np.ndarray, t0: float, w: tuple[float, float]) -> float:
    m = (tau >= t0 + w[0]) & (tau <= t0 + w[1])
    return float(y[m].mean()) if m.any() else float("nan")


def _patch(skin: np.ndarray, k: int, N: int, j: int, ring: np.ndarray, s: float) -> np.ndarray:
    """A patch's perfusion over time: its own vessel's share, and its open neighbours' for the rest (1 if none)."""
    own = skin[:, k * N + j]
    nb = skin[:, k * N + ring].mean(axis=1) if len(ring) else np.ones(len(own))
    return s * own + (1 - s) * nb


def _needed(effect: float, sd: float) -> int | None:
    """Knots or releases for a paired comparison at 5% and 80% power (normal approximation); never fewer than three."""
    if not np.isfinite(effect) or effect <= 0:
        return None
    return max(3, int(np.ceil((Z * sd / effect) ** 2)))


def _pct(xs: list[float]) -> dict | None:
    xs = [x for x in xs if np.isfinite(x)]
    if not xs:
        return None
    return {"median": float(np.median(xs)), "lo": float(np.percentile(xs, 10)), "hi": float(np.percentile(xs, 90)),
            "n": len(xs)}


def read(rec: dict, tid: str) -> dict:
    """What each reading shows at the recording site and its shams, over the sets with a release."""
    tau, N, kind = rec["tau"], rec["N"], rec["kind"]
    sites = _sites(rec)
    press0 = rec["start"]  # the press (or the focus) starts here; broad breaths start at 0
    rows: dict[str, list] = {}

    def put(key: str, x: float):
        rows.setdefault(key, []).append(x)

    for st in sites:
        k, j, t = st["k"], st["j"], st["t"]
        put("release_s", t - press0 if kind != "broad" else t)
        if kind == "broad":
            put("out_breath", float(exam.out_breath(np.array([t]))[0]))
        if tid == "T1":
            skin = rec["reading"]["skin"]
            far = skin[:, k * N + st["far"]].mean(axis=1)
            nb = skin[:, k * N + st["ring"]].mean(axis=1) if len(st["ring"]) else np.ones(len(tau))
            before = press0 if kind != "broad" else t  # before anything local began (or, under broad breaths, the release)
            for s in OWN:
                P = _patch(skin, k, N, j, st["ring"], s)
                # the knot's patch against its neighbours' (1 minus the ratio: how much darker it is), before and after
                dark0 = 1 - _mean(P, tau, before, BEFORE) / _mean(nb, tau, before, BEFORE)
                dark1 = 1 - _mean(P, tau, t, AFTER) / _mean(nb, tau, t, AFTER)
                put(f"dark_before_{s:g}", dark0)
                put(f"dark_after_{s:g}", dark1)
                put(f"dark_gone_{s:g}", dark0 - dark1)
                put(f"jump_{s:g}", _mean(P, tau, t, AFTER) - _mean(P, tau, t, BEFORE))
            if kind == "press" and len(st["pressed"]):  # pressure's own flush: a pressed site with no knot, at the lift
                sham = skin[:, k * N + st["pressed"]].mean(axis=1)
                put("lift_sham", _mean(sham, tau, t, AFTER) - _mean(sham, tau, press0, BEFORE))
            put("jump_far", _mean(far, tau, t, AFTER) - _mean(far, tau, t, BEFORE))
            if kind == "focused" and len(st["ring"]):  # the open neighbours while the breath is aimed
                ring = skin[:, k * N + st["ring"]].mean(axis=1)
                put("ring", _mean(ring, tau, press0 + 20.0, (0.0, 10.0)) / _mean(ring, tau, press0, BEFORE) - 1)
                put("far_focus", _mean(far, tau, press0 + 20.0, (0.0, 10.0)) / _mean(far, tau, press0, BEFORE) - 1)
        elif tid == "T3":
            c = rec["reading"]["stiffness"][:, k * N + j]
            put("stiffness", _mean(c, tau, t, AFTER) - _mean(c, tau, press0 if kind != "broad" else t, BEFORE))
            put("stiffness_before", _mean(c, tau, press0 if kind != "broad" else t, BEFORE))
            q = rec["reading"]["nidus_flow"][:, k * N + j]
            if kind == "press":  # the nidus's flow once the hand has lifted, against before the press
                put("nidus_flow", _mean(q, tau, press0 + PRESS_FOR, AFTER) - _mean(q, tau, press0, BEFORE))
            else:
                put("nidus_flow", _mean(q, tau, t, AFTER) - _mean(q, tau, t, BEFORE))
        elif tid == "T7":
            f = rec["reading"]["firing"]
            put("firing_before", _mean(f[:, k * N + j], tau, press0 if kind != "broad" else t, BEFORE))
            put("firing_after", _mean(f[:, k * N + j], tau, t, AFTER))
            if kind == "press" and len(st["pressed"]):  # units under the same hand that held no knot, while it presses
                put("pressed_firing", _mean(f[:, k * N + st["pressed"]].mean(axis=1), tau, press0, (0.0, PRESS_FOR)))
            put("far_firing", _mean(f[:, k * N + st["far"]].mean(axis=1), tau, t, AFTER))
        else:
            F = rec["reading"]["felt"]
            put("felt_before", _mean(F[:, k * N + j], tau, press0, BEFORE))
    return {"sites": len(sites), "sets": rec["K"], **{key: _pct(v) for key, v in rows.items()}}


def trace(rec: dict, tid: str, s: float = 0.6, step: float = 0.5) -> dict | None:
    """The press, as recorded at a representative site (the set whose release is the median): around the press's
    start, the knot's reading, a pressed sham's and a far sham's."""
    sites = _sites(rec)
    if not sites:
        return None
    st = sorted(sites, key=lambda x: x["t"])[len(sites) // 2]
    k, j, N, tau = st["k"], st["j"], rec["N"], rec["tau"]
    grid = np.arange(rec["start"] + TRACE[0], min(rec["start"] + TRACE[1], tau[-1]), step)
    at = lambda y: np.interp(grid, tau, y).round(4).tolist()
    if tid == "T1":
        skin = rec["reading"]["skin"]
        knot = _patch(skin, k, N, j, st["ring"], s)
        pressed = skin[:, k * N + st["pressed"]].mean(axis=1) if len(st["pressed"]) else np.ones(len(tau))
        far = skin[:, k * N + st["far"]].mean(axis=1)
        series = {"knot": at(knot), "pressed": at(pressed), "far": at(far)}
    elif tid == "T3":
        c = rec["reading"]["stiffness"]
        pressed = c[:, k * N + st["pressed"]].mean(axis=1) if len(st["pressed"]) else np.zeros(len(tau))
        series = {"knot": at(c[:, k * N + j]), "pressed": at(pressed), "far": at(c[:, k * N + st["far"]].mean(axis=1))}
    elif tid == "T7":
        f = rec["reading"]["firing"]
        pressed = f[:, k * N + st["pressed"]].mean(axis=1) if len(st["pressed"]) else np.zeros(len(tau))
        series = {"knot": at(f[:, k * N + j]), "pressed": at(pressed), "far": at(f[:, k * N + st["far"]].mean(axis=1))}
    else:
        F = rec["reading"]["felt"]
        pressed = F[:, k * N + st["pressed"]].mean(axis=1) if len(st["pressed"]) else np.zeros(len(tau))
        series = {"knot": at(F[:, k * N + j]), "pressed": at(pressed), "far": at(F[:, k * N + st["far"]].mean(axis=1))}
    return {"t": (grid - rec["start"]).round(2).tolist(), "release_s": round(st["t"] - rec["start"], 1),
            "press_s": PRESS_FOR, **series}


def _job(args) -> tuple:
    tid, variant, kind = args
    rec = record(tid, variant, kind)
    return tid, variant, kind, read(rec, tid), (trace(rec, tid) if kind == "press" and variant == RUNS[tid][1][0] else None)


def design(read_out: dict) -> dict:
    """How many knots, or releases, would show the perforator view's two signs in skin perfusion (a knot's patch darker
    than its neighbours'; the darkness gone once it lets go), by the size of the region read, the share of its patch a
    vessel feeds and laser speckle's variability."""
    v = values("instrument")
    cvs = (v["lsci_cv_low"], v["lsci_cv_high"])
    out = {"dark": [], "gone": []}
    t1 = read_out["T1"]["drive"]["press"]
    for roi in ROI_MM:
        dilute = 1.0 if roi == 0 else min(1.0, (v["patch_mm"] / roi) ** 2)  # the patch's share of a wider region
        for s in OWN:
            dark, gone = t1.get(f"dark_before_{s:g}"), t1.get(f"dark_gone_{s:g}")
            # a knot's patch against its neighbours, one reading each: the difference's noise is sqrt(2) CV
            d = dark["median"] * dilute if dark else float("nan")
            out["dark"].append({"roi_mm": roi, "own_share": s, "effect": d,
                                "needed": [_needed(d, np.sqrt(2) * cv) for cv in cvs]})
            # the same, before the press and after the release: two such differences, so 2 CV
            e = gone["median"] * dilute if gone else float("nan")
            out["gone"].append({"roi_mm": roi, "own_share": s, "effect": e, "needed": [_needed(e, 2 * cv) for cv in cvs]})
    out["cv"] = list(cvs)
    out["patch_mm"] = v["patch_mm"]
    return out


def inputs_hash() -> str:
    """The exam's inputs (its trials, theories, models and tables), this file and its own table: instrument.json
    carries it; a test fails when it is stale."""
    sim = Path(__file__).resolve().parents[1]
    h = hashlib.sha256(exam.inputs_hash().encode())
    for f in (Path(__file__), sim / "params" / "instrument.yaml"):
        h.update(f.read_bytes())
    return h.hexdigest()[:12]


SITE = exam.SITE.parent / "instrument.json"


def main(workers: int = 4) -> dict:
    from concurrent.futures import ProcessPoolExecutor

    from .export import _git

    jobs = [(tid, variant, kind) for tid, (_, variants) in RUNS.items() for variant in variants for kind in KINDS
            if not (kind == "focused" and variant not in ("aimed", "movement", "arousal", "drive+stretch", "inhibit"))]
    with ProcessPoolExecutor(workers) as pool:
        done = list(pool.map(_job, jobs))
    reads: dict = {}
    traces: dict = {}
    for tid, variant, kind, r, tr in done:
        reads.setdefault(tid, {}).setdefault(variant, {})[kind] = r
        if tr is not None:
            traces[tid] = tr
    out = {"run": {"inputs": inputs_hash(), **_git()}, "samples": exam.K, "spacing": {"near": NEAR, "far": FAR},
           "windows": {"before": BEFORE, "after": AFTER}, "own_share": list(OWN), "roi_mm": list(ROI_MM),
           "reads": reads, "traces": traces, "design": design(reads)}
    SITE.write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False) + "\n")
    return out


if __name__ == "__main__":
    o = main()
    print(json.dumps(o["design"], indent=1)[:3000])
    for tid, vs in o["reads"].items():
        for v_, kinds in vs.items():
            for kind, r in kinds.items():
                print(tid, v_, kind, {k: (round(x["median"], 3) if isinstance(x, dict) else x) for k, x in r.items()})
