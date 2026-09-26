"""The harness: every theory through the sealed exam (observations/spec.yaml, v1), part by part (sim/PLAN.md §5b).

For each theory and each of its variants, every scored part's trial runs over parameter sets sampled across the theory's
own plausible ranges, and the cell records the share of sets in which the part holds (never one tuned setting). A theory
whose account says nothing about a part is *silent* on it; a part that no trial can test yet is *not run*. A variant's
joint pass is the share of sets that pass every part it is scored on, at once.

The trials and the pass criteria live here, once, in the sealed readings: the same for every theory. Each theory maps
them onto its own states in its adapter (knots_sim/theories/), where the mapping can be read and checked for fairness:
a single held knot at a range of depths (its own margin: 0 at its release threshold), a patch of knots on a shared
geometry, a cluster, and the count its unit allows.

Stress is in one unit for every theory: 0 is rest, 1 a surge that forms knots, and `hold` (0.4-0.7) the stress that keeps
them. Each adapter sets its own scale by the same rule: the typical place that can hold a knot, where stress is held
most, sits in the middle of its window (the surge makes it a knot; the holding stress keeps it one, and cannot make it
one alone). A local trial (focused breath, a press) starts after 30 broad breaths, once the easy knots have gone, so
that what it lets go is its own.

    uv run python -m knots_sim.exam      # runs every theory; writes src/data/sim/matrix.json
"""

from __future__ import annotations

import hashlib
import importlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import yaml

SIM = Path(__file__).resolve().parents[1]
SPEC = SIM / "observations" / "spec.yaml"
SEAL = SIM / "observations" / "seal.yaml"
SITE = SIM.parent / "src" / "data" / "sim" / "matrix.json"
THEORIES = ("t1", "t3", "t6")
SILENT, NOT_RUN = "silent", "not run"
K = 32  # parameter sets per theory (a power of two, as the Sobol sampler wants)
SEED = 17


def sealed() -> dict:
    """The sealed exam. Refuses a file that differs from its seal."""
    seal = yaml.safe_load(SEAL.read_text())["seals"][-1]
    if hashlib.sha256(SPEC.read_bytes()).hexdigest() != seal["sha256"]:
        raise RuntimeError("the exam differs from its seal: only a new, dated version may change it")
    return yaml.safe_load(SPEC.read_text()) | {"seal": seal}


# ---------- The shared trials ----------

PERIOD, INHALE = 10.0, 4.0  # a slow breath: 4 s in, 6 s out (the sealed reading of "a breath")
BREATHS = 30  # "many breaths": from the third to the thirtieth
DEPTHS = (0.02, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85)  # a knot's margin, in its theory's own terms
DEEP = 0.5  # "deeper, persistent knots": the upper half of the margins
AGE_DEPTH = 0.3  # the knot that ages: a third of the way up its band
SPARK = 0.05  # a sensation, on each theory's own 0-1 scale
WITHIN = 10.0  # "within seconds" (the sealed reading): a spark counts if it comes within 10 s of the release
PRESS_FOR = 60.0  # a press held for six breaths, then lifted
SURGE = (5.0, 185.0)  # a surge of stress (1 in the shared unit), three minutes long, forms the knots
T0 = SURGE[1] + 200.0  # then the holding stress, 200 s, before any trial starts
PREP = BREATHS * PERIOD  # a local trial starts after 30 broad breaths


def out_breath(t: np.ndarray | float) -> np.ndarray:
    """During an out-breath (breaths start with the in-breath)."""
    return np.mod(t, PERIOD) >= INHALE


def calm(t: np.ndarray | float, size, tau):
    """How far slow breathing has lowered stress after t s of it (the shared unit): δ_calm (1 - e^(-t/τ_calm))."""
    return size * (1 - np.exp(-np.maximum(t, 0.0) / tau))


def breath_wave(t: np.ndarray) -> np.ndarray:
    """+1 at the top of the in-breath, -1 at the end of the out-breath."""
    ph = np.mod(t, PERIOD)
    return np.where(ph < INHALE, -np.cos(np.pi * ph / INHALE), np.cos(np.pi * (ph - INHALE) / (PERIOD - INHALE)))


@dataclass(frozen=True)
class Single:
    """One held knot, then slow breaths from t = 0 (starting with an in-breath)."""

    focus: bool = False  # focused attention, and the breath, at the knot's place
    press: bool = False  # a hand or roller on the knot from t = 0 for PRESS_FOR s
    breaths: int = BREATHS


@dataclass
class SingleOut:
    """Per parameter set and depth ([K, len(DEPTHS)]): whether the knot formed; when it let go (s from the first breath,
    nan if it held); whether that was during an out-breath, and while still pressed; the strongest sensation at the knot
    within WITHIN s of its release, and at a distant place at the same time (nan where the theory has no sensation)."""

    formed: np.ndarray
    rel_t: np.ndarray
    during_out: np.ndarray
    pressed: np.ndarray
    spark_here: np.ndarray
    spark_far: np.ndarray


def geometry(n: int = 64, seed: int = 5) -> dict:
    """The shared patch: a jittered grid on the unit square, each place's share of the stress (more in a band and a
    blob: where stress is held), and the place where a breath is focused or a hand presses. Representative."""
    rng = np.random.default_rng(seed)
    side = int(np.ceil(np.sqrt(n)))
    g = (np.stack(np.meshgrid(np.arange(side), np.arange(side)), -1).reshape(-1, 2)[:n] + 0.5) / side
    pos = np.clip(g + rng.normal(0, 0.18 / side, g.shape), 0.01, 0.99)
    x, y = pos[:, 0], pos[:, 1]
    zone = 0.35 + 0.65 * np.exp(-(((y - 0.82) / 0.22) ** 2)) + 0.45 * np.exp(-((x - 0.22) ** 2 + (y - 0.3) ** 2) / 0.02)
    spot, radius = np.array([0.64, 0.8]), 0.16
    near = ((pos - spot) ** 2).sum(axis=1) < radius**2
    return {"pos": pos, "zone": np.clip(zone, 0, 1.2), "near": near, "spot": spot, "radius": radius, "n": n}


PATCH = geometry()
MOOD_FOR = 3600.0  # "in an hour"
HOLD_FOR = 1800.0  # the count: knots held after half an hour at a stress (a theory's knots may take that long to form)


def mood(sd: float, tau: float, seed: int, step: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Mood as slow random swings of stress (an Ornstein-Uhlenbeck process, in the shared unit), the same path for every
    theory given the set's seed: (times, stress added)."""
    rng = np.random.default_rng(seed)
    t = np.arange(0.0, MOOD_FOR + step, step)
    a = np.exp(-step / tau)
    e = rng.normal(0.0, sd * np.sqrt(1 - a * a), len(t))
    x = np.zeros(len(t))
    for i in range(1, len(t)):
        x[i] = a * x[i - 1] + e[i]
    return t, x


@dataclass(frozen=True)
class Patch:
    """A patch of knots formed by a surge of stress (each place by its share), held at the shared holding stress times
    `stress` until T0, then: one slow breath; 30 slow breaths everywhere (broad); 30 broad breaths, then 30 focused at
    the spot (focused); 30 broad breaths, then a press at the spot with attention and slow breaths for PRESS_FOR s and
    30 s more of slow breaths (press); nothing for HOLD_FOR s (hold, to count the knots); or, from rest, an hour of slow
    breaths while mood moves the stress (mood). Times below are s after T0 (for mood, from its start)."""

    kind: str  # "one_breath" | "broad" | "focused" | "press" | "hold" | "mood"
    stress: float = 1.0

    @property
    def start(self) -> float:
        """When the scored phase starts: a local trial follows 30 broad breaths."""
        return PREP if self.kind in ("focused", "press") else 0.0

    @property
    def breathing_for(self) -> float:
        return {"one_breath": PERIOD, "broad": PREP, "focused": 2 * PREP, "press": PREP + PRESS_FOR + 30.0,
                "hold": 0.0, "mood": MOOD_FOR}[self.kind]

    @property
    def duration(self) -> float:
        return {"hold": HOLD_FOR, "mood": MOOD_FOR}.get(self.kind, self.breathing_for + 5.0)

    def at(self, t: float) -> tuple[bool, bool, bool]:
        """At time t: (breathing slowly, attention at the spot, a hand pressing the spot)."""
        s = t - self.start
        local = {"focused": 0 <= s < PREP, "press": 0 <= s < PRESS_FOR}.get(self.kind, False)
        return t < self.breathing_for, local, self.kind == "press" and local


@dataclass
class PatchOut:
    held0: list  # per set: knots held when the scored phase starts (bool, N)
    rel_t: list  # per set: when each let go (s from the scored phase's start; nan if it held)
    cycles: list | None = None  # mood: per set, form-and-release cycles at each place
    shortest: list | None = None  # mood: per set, the shortest hold at each place (s; inf if none)


def releases(t: np.ndarray, held: np.ndarray, start: float) -> tuple[np.ndarray, np.ndarray]:
    """From a record of which units hold ([time, unit]): those held at `start`, and when each first let go after it
    (s from `start`; nan if it held throughout)."""
    i0 = max(int(np.searchsorted(t, start, side="right")) - 1, 0)
    held0 = held[i0].astype(bool)
    gone = ~held[i0:].astype(bool) & held0
    first = np.argmax(gone, axis=0)
    return held0, np.where(gone.any(axis=0), t[i0:][first] - t[i0], np.nan)


def coming_and_going(t: np.ndarray, held: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per unit: how many times it formed and let go in the record, and the shortest such hold (s; inf if none)."""
    edges = np.diff(held.astype(np.int8), axis=0)
    n = held.shape[1]
    cyc, best = np.zeros(n, int), np.full(n, np.inf)
    for j in np.flatnonzero((edges == 1).any(axis=0)):
        on, off = np.flatnonzero(edges[:, j] == 1), np.flatnonzero(edges[:, j] == -1)
        for a in on:
            later = off[off > a]
            if len(later):
                cyc[j] += 1
                best[j] = min(best[j], t[later[0] + 1] - t[a + 1])
    return cyc, best


@dataclass
class ClusterOut:
    with_: np.ndarray  # per set: others that let go within 10 s of the worked knot
    new_nearby: np.ndarray  # per set: a new knot formed nearby within 10 min


@dataclass
class AgeOut:
    """A knot of depth AGE_DEPTH held by its stress, then the stress ends."""

    brief_released: np.ndarray  # per set: a knot held 30 min lets go when its stress ends
    long_persists: np.ndarray  # per set: one held 3 h stays held at rest


@dataclass(frozen=True)
class Density:
    """The theory's unit: how dense, and how many in a body (from its own sources)."""

    per_mm2: float
    total: float
    note: str


# ---------- The parts and their pass criteria (the sealed readings) ----------


@dataclass(frozen=True)
class Part:
    id: str
    obs: str
    says: str
    short: str  # what a theory must do, as a phrase: "it can ..."


PARTS = (
    Part("O1.1", "O1", "A slow out-breath lets the easiest knots go, during an out-breath",
         "let an easy knot go on the out-breath"),
    Part("O1.2", "O1", "One relaxing breath lets three or more knots go, within that breath",
         "let three or more go in one relaxing breath"),
    Part("O1.3", "O1", "Deep knots hold through 30 relaxing breaths, and let go to focused attention and breath within 30",
         "keep deep knots through calm breathing and let them go to focus"),
    Part("O1.4", "O1", "Release can be broad (spread across the patch) and focused (most of it at one place)",
         "release both broadly and at one place"),
    Part("O1.5", "O1", "Under one way of breathing, some knots go by the 2nd breath and others from the 3rd to the 30th",
         "let easy knots go in a breath or two and hard ones over many"),
    Part("O2.1", "O2", "Pressure and attention at one place let knots go there, few elsewhere",
         "release one place at a time under a hand"),
    Part("O2.2", "O2", "Pressed, breathing slowly, at least half of knots let go during the first out-breath, still pressed",
         "let a pressed knot go within the first out-breath, still pressed"),
    Part("O3", "O3", "Drinking water eases release, and speeds it", "answer to water"),
    Part("O4.1", "O4", "More stress holds more knots", "hold more knots under more stress"),
    Part("O4.2", "O4", "Knots gather where stress is held", "gather knots where stress is held"),
    Part("O16.1", "O16", "Under breath and mood, a knot forms and lets go at least twice in an hour",
         "let knots come and go with breath and mood"),
    Part("O16.2", "O16", "A knot forms and lets go within a single breath", "form and release a knot within one breath"),
    Part("O5", "O5", "Knots limit movement; a stretch meets them as dull, deep blocks", "limit movement"),
    Part("O6", "O6", "A release brings, within seconds, a brief sensation confined to the knot's own place",
         "spark at the knot's own place as it goes"),
    Part("O8", "O8", "After one knot lets go, a new one forms nearby within minutes",
         "form a new knot nearby after a release"),
    Part("O13", "O13", "Releasing one knot lets three or more others go with it, within seconds",
         "let three or more go with one"),
    Part("O15", "O15", "The unit exists at dozens per square inch and about 100,000 in a body",
         "have a unit as dense as micro knots"),
    Part("O9", "O9", "Working one side eases the other", "ease the other side"),
    Part("O10.1", "O10", "A knot held briefly lets go when its stress ends; one held for hours persists",
         "let a brief knot go and keep an old one"),
    Part("O10.2", "O10", "Knots accumulate with age", "accumulate knots with age"),
)
NOT_RUN_YET = {"O5", "O9", "O10.2"}  # the mechanics and body stages (PLAN §5b)


def _count(rel: np.ndarray, lo: float, hi: float) -> int:
    return int(((rel >= lo) & (rel < hi)).sum())


def _single_parts(s: SingleOut, focused: SingleOut, pressed: SingleOut) -> dict[str, np.ndarray]:
    d = np.array(DEPTHS)
    released = ~np.isnan(s.rel_t)
    deep = d >= DEEP
    first_out = (pressed.rel_t >= INHALE) & (pressed.rel_t < INHALE + 10.0) & pressed.during_out & pressed.pressed
    spark = released & (s.spark_here >= SPARK) & ~(s.spark_far >= SPARK / 2)
    return {
        "O1.1": s.formed[:, 0] & released[:, 0] & s.during_out[:, 0],
        "O1.3": (s.formed[:, deep] & ~released[:, deep]).all(axis=1) & (~np.isnan(focused.rel_t[:, deep])).any(axis=1),
        "O2.2": (np.where(pressed.formed, first_out, False).sum(axis=1) >= 0.5 * pressed.formed.sum(axis=1))
        & (pressed.formed.sum(axis=1) > 0),
        "O6": np.where(np.isnan(s.spark_here).all(axis=1), False, spark.any(axis=1) & (spark | ~released).all(axis=1)),
    }


def _patch_parts(p: dict[str, PatchOut]) -> dict[str, np.ndarray]:
    near = PATCH["near"]
    zone = PATCH["zone"]
    top, bottom = zone >= np.quantile(zone, 2 / 3), zone <= np.quantile(zone, 1 / 3)
    out = {k: [] for k in ("O1.2", "O1.4", "O1.5", "O2.1", "O4.1", "O4.2", "O16.1", "O16.2")}
    for i in range(len(p["broad"].rel_t)):
        one = p["one_breath"].rel_t[i]
        out["O1.2"].append(_count(one, 0.0, PERIOD) >= 3)
        b, f = p["broad"].rel_t[i], p["focused"].rel_t[i]
        out["O1.5"].append(_count(b, 0.0, 2 * PERIOD + 1e-9) >= 1 and _count(b, 2 * PERIOD + 1e-9, PREP + 1e-9) >= 1)
        rb, rf = ~np.isnan(b), ~np.isnan(f)
        broad = rb.sum() >= 3 and (rb & near).sum() <= 0.5 * rb.sum()
        focus = rf.sum() >= 1 and (rf & near).sum() >= 0.7 * rf.sum()
        out["O1.4"].append(bool(broad and focus))
        pr = ~np.isnan(p["press"].rel_t[i])
        out["O2.1"].append(bool((pr & near).sum() >= 1 and (pr & ~near).sum() <= 0.2 * pr.sum()))
        lo, mid, hi = (p[f"hold{x}"].held0[i].sum() for x in ("0.6", "1.0", "1.4"))
        out["O4.1"].append(bool(lo <= mid <= hi and lo < hi))
        held = p["hold1.0"].held0[i]
        out["O4.2"].append(bool(held[top].sum() >= 2 and held[top].mean() >= 2 * max(held[bottom].mean(), 1e-9)))
        out["O16.1"].append(bool((p["mood"].cycles[i] >= 2).any()))
        out["O16.2"].append(bool((p["mood"].shortest[i] <= PERIOD).any()))
    return {k: np.array(v) for k, v in out.items()}


def score_variant(theory, ps: list[dict], variant: str) -> dict[str, np.ndarray | str]:
    """Every part for one variant: a pass per parameter set, or SILENT or NOT_RUN."""
    cells: dict[str, np.ndarray | str] = {}
    s = theory.single(ps, variant, DEPTHS, Single())
    f = theory.single(ps, variant, DEPTHS, Single(focus=True))
    pr = theory.single(ps, variant, DEPTHS, Single(press=True, breaths=int(PRESS_FOR / PERIOD)))
    cells |= _single_parts(s, f, pr)
    kinds = {"one_breath": Patch("one_breath"), "broad": Patch("broad"), "focused": Patch("focused"),
             "press": Patch("press"), "mood": Patch("mood"),
             **{f"hold{x}": Patch("hold", float(x)) for x in ("0.6", "1.0", "1.4")}}
    cells |= _patch_parts({k: theory.patch(ps, variant, pr_) for k, pr_ in kinds.items()})
    c = theory.cluster(ps, variant)
    cells["O8"], cells["O13"] = c.new_nearby, c.with_ >= 3
    age = theory.ageing(ps, variant)
    cells["O10.1"] = NOT_RUN if age is None else age.brief_released & age.long_persists
    d = theory.density()
    cells["O15"] = np.full(len(ps), d.per_mm2 >= 1 / 25 and d.total >= 1e5) if d is not None else SILENT
    for pid in NOT_RUN_YET:
        cells[pid] = NOT_RUN
    for pid in theory.SILENT:
        cells[pid] = SILENT
    cells.setdefault("O3", SILENT)
    return cells


def count(theory, ps: list[dict], variant: str) -> dict | None:
    """How many knots the theory would hold in a body: the share of the patch's units held at the holding stress, times
    the units a body has (its own sources). The patch is a place where stress is held, so this is an upper figure: a
    body held like the patch everywhere. None for a theory with no unit to count."""
    d = theory.density()
    if d is None:
        return None
    share = np.array([h.mean() for h in theory.patch(ps, variant, Patch("hold", 1.0)).held0])
    n = share * d.total
    some = n[n > 0]
    return {"units": d.total, "per_mm2": d.per_mm2, "note": d.note, "median": round(float(np.median(n))),
            "lo": round(float(np.quantile(n, 0.1))), "hi": round(float(np.quantile(n, 0.9))),
            "share": round(float(np.median(share)), 3), "none": round(float((n == 0).mean()), 3),
            "median_any": round(float(np.median(some))) if len(some) else None}


def _theory(name: str):
    return importlib.import_module(f".theories.{name}", __package__)


def run_variant(name: str, variant: str, k: int = K, seed: int = SEED) -> dict:
    """One variant of one theory through every part: its cells, joint pass and count."""
    theory = _theory(name)
    ps = theory.sample(k, seed)
    cells = score_variant(theory, ps, variant)
    scored = [v for v in cells.values() if not isinstance(v, str)]
    joint = np.all(np.array(scored), axis=0) if scored else np.zeros(len(ps), bool)
    return {
        "name": variant,
        "description": theory.VARIANTS[variant],
        "cells": {p.id: (c if isinstance(c := cells[p.id], str) else round(float(np.mean(c)), 3)) for p in PARTS},
        "joint": round(float(joint.mean()), 3),
        "passes": {p.id: cells[p.id].astype(int).tolist() for p in PARTS if not isinstance(cells[p.id], str)},
        "count": count(theory, ps, variant),
    }


def run_theory(name: str, k: int = K, seed: int = SEED, pool=None) -> dict:
    theory = _theory(name)
    jobs = [(name, variant, k, seed) for variant in theory.VARIANTS]
    variants = list(pool.map(_job, jobs)) if pool else [_job(j) for j in jobs]
    return {"id": theory.ID, "name": theory.NAME, "samples": k, "variants": variants,
            "notes": getattr(theory, "NOTES", {})}


def _job(args) -> dict:
    return run_variant(*args)


def inputs_hash() -> str:
    """A hash of everything the exam depends on: the harness, the theories and their models, the parameter tables and
    the sealed exam. matrix.json carries it; a test fails when it is stale."""
    pkg = SIM / "knots_sim"
    files = [pkg / "exam.py", pkg / "adapt.py", pkg / "params.py", *(pkg / "theories").glob("*.py"),
             *(pkg / "models").glob("*.py"), *(SIM / "params").glob("*.yaml"), SPEC, SEAL]
    h = hashlib.sha256()
    for f in sorted(files):
        h.update(f.relative_to(SIM).as_posix().encode())
        h.update(f.read_bytes())
    return h.hexdigest()[:12]


def main(workers: int = 4) -> dict:
    from concurrent.futures import ProcessPoolExecutor

    from .export import _git

    spec = sealed()
    with ProcessPoolExecutor(workers) as pool:
        # every variant of every theory at once; the slowest first
        jobs = [(name, variant, K, SEED) for name in THEORIES for variant in _theory(name).VARIANTS]
        done = dict(zip([(j[0], j[1]) for j in jobs], pool.map(_job, jobs)))
    theories = []
    for name in THEORIES:
        theory = _theory(name)
        theories.append({"id": theory.ID, "name": theory.NAME, "samples": K,
                         "variants": [done[(name, v)] for v in theory.VARIANTS], "notes": getattr(theory, "NOTES", {})})
    out = {
        "run": {"inputs": inputs_hash(), **_git()},
        "exam": {"version": spec["version"], "sealed": str(spec["sealed"]), "sha256": spec["seal"]["sha256"]},
        "trials": {"surge_s": SURGE[1] - SURGE[0], "settle_s": T0 - SURGE[1], "breath_s": [INHALE, PERIOD - INHALE],
                   "breaths": BREATHS, "press_s": PRESS_FOR, "hold_s": HOLD_FOR, "mood_s": MOOD_FOR,
                   "depths": list(DEPTHS), "patch": PATCH["n"],
                   "samples": K, "seed": SEED},
        "parts": [{"id": p.id, "obs": p.obs, "says": p.says, "short": p.short} for p in PARTS],
        "theories": theories,
    }
    SITE.parent.mkdir(parents=True, exist_ok=True)
    SITE.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    from .findings import write_exam

    write_exam(out)
    return out


if __name__ == "__main__":
    m = main()
    for t in m["theories"]:
        for v in t["variants"]:
            print(f"{t['id']} {v['name']:<12} joint {v['joint']:.2f}  " + "  ".join(
                f"{pid}:{c if isinstance(c, str) else f'{c:.2f}'}" for pid, c in v["cells"].items()))
