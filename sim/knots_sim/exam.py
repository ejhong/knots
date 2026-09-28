"""The harness: every theory through the exam (observations/spec.yaml, versioned), part by part (sim/PLAN.md §5b).

For each theory and each of its variants, every scored part's trial runs over parameter sets sampled across the theory's
own plausible ranges, and the cell records the share of sets in which the part holds (never one tuned setting). A theory
whose account says nothing about a part is *silent* on it; a part that no trial can test yet is *not run*. A variant's
joint pass is the share of sets that pass every part it is scored on, at once.

The trials and the pass criteria live here, once, from the exam's readings: the same for every theory. Each theory maps
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
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import yaml

SIM = Path(__file__).resolve().parents[1]
SPEC = SIM / "observations" / "spec.yaml"
SITE = SIM.parent / "src" / "data" / "sim" / "matrix.json"
THEORIES = ("t1", "t3", "t6", "t7")
SILENT, NOT_RUN = "silent", "not run"
K = 32  # parameter sets per theory (a power of two, as the Sobol sampler wants)
SEED = 17


def spec() -> dict:
    """The exam, at its current version. Each change is dated, with its reason, in its `changes`; every result names the
    version it used. (Versions 1-3 were also sealed by hash: observations/seal.yaml keeps that record.)"""
    s = yaml.safe_load(SPEC.read_text())
    if not any(c.get("version") == s["version"] for c in s.get("changes", [])):
        raise RuntimeError(f"exam v{s['version']} has no entry in `changes`: say what changed, and why")
    return s


# ---------- The shared trials ----------

PERIOD, INHALE = 10.0, 4.0  # a slow breath: 4 s in, 6 s out (the reading of "a breath")
BREATHS = 30  # "many breaths": from the third to the thirtieth
DEPTHS = (0.02, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85)  # a knot's margin, in its theory's own terms
DEEP = 0.5  # "deeper, persistent knots": the upper half of the margins
AGE_DEPTH = 0.3  # the knot that ages: a third of the way up its band
SPARK = 0.05  # a sensation, on each theory's own 0-1 scale
WITHIN = 10.0  # "within seconds" (the reading): a spark counts if it comes within 10 s of the release
PRESS_FOR = 60.0  # a press held for six breaths, then lifted
START = INHALE / 2  # slow breaths begin halfway up an in-breath, where the wave crosses its middle: no jump from the breath before them
FIRST_OUT = INHALE - START  # so the first out-breath begins 2 s in
EASE_AT = FIRST_OUT + (PERIOD - INHALE) / 2  # or a hand that eases off halfway through the first out-breath (reading, v2)
SURGE = (5.0, 185.0)  # a surge of stress (1 in the shared unit), three minutes long, forms the knots
T0 = SURGE[1] + 200.0  # then the holding stress, 200 s, before any trial starts
PREP = BREATHS * PERIOD  # a local trial starts after 30 broad breaths


def out_breath(t: np.ndarray | float) -> np.ndarray:
    """During an out-breath (slow breaths start halfway up an in-breath)."""
    return np.mod(np.asarray(t) + START, PERIOD) >= INHALE


def calm(t: np.ndarray | float, size, tau):
    """How far slow breathing has lowered stress after t s of it (the shared unit): δ_calm (1 - e^(-t/τ_calm))."""
    return size * (1 - np.exp(-np.maximum(t, 0.0) / tau))


def breath_wave(t: np.ndarray) -> np.ndarray:
    """+1 at the top of the in-breath, -1 at the end of the out-breath; 0 at t = 0, halfway up the first in-breath, so
    slow breathing starts without a jump (it once started at -1, the bottom of an out-breath: a step at the onset that
    released some theories' easiest knots at once, corrected 27 Sep 2026)."""
    ph = np.mod(np.asarray(t) + START, PERIOD)
    return np.where(ph < INHALE, -np.cos(np.pi * ph / INHALE), np.cos(np.pi * (ph - INHALE) / (PERIOD - INHALE)))


@dataclass(frozen=True)
class Single:
    """One held knot, then slow breaths from t = 0 (starting halfway up an in-breath)."""

    focus: bool = False  # focused attention, and the breath, at the knot's place
    press: bool = False  # a hand or roller on the knot from t = 0 for press_for s
    breaths: int = BREATHS
    press_for: float = PRESS_FOR


@dataclass
class SingleOut:
    """Per parameter set and depth ([K, len(DEPTHS)]): whether the knot formed; when it let go (s from the first breath,
    nan if it held); whether that was during an out-breath, and before the hand lifted; the strongest sensation at the knot
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
    breaths while mood moves the stress (mood). Times below are s after T0 (for mood, from its start). Hand and attention
    apart (the author, 27 Sep 2026: "breath plus attention alone may be enough but the pressure may help focus attention
    to area"): as press, but attention at the spot without a hand (attend), a hand with attention elsewhere (hand), or
    neither, the slow breaths going on (rest)."""

    kind: str  # "one_breath" | "broad" | "focused" | "press" | "attend" | "hand" | "rest" | "hold" | "mood"
    stress: float = 1.0

    @property
    def start(self) -> float:
        """When the scored phase starts: a local trial follows 30 broad breaths."""
        return PREP if self.kind in ("focused", "press", "attend", "hand", "rest") else 0.0

    @property
    def breathing_for(self) -> float:
        if self.kind in ("press", "attend", "hand", "rest"):
            return PREP + PRESS_FOR + 30.0
        return {"one_breath": PERIOD, "broad": PREP, "focused": 2 * PREP, "hold": 0.0, "mood": MOOD_FOR}[self.kind]

    @property
    def duration(self) -> float:
        return {"hold": HOLD_FOR, "mood": MOOD_FOR}.get(self.kind, self.breathing_for + 5.0)

    def at(self, t: float) -> tuple[bool, bool, bool]:
        """At time t: (breathing slowly, attention at the spot, a hand pressing the spot)."""
        s = t - self.start
        working = 0 <= s < (PREP if self.kind == "focused" else PRESS_FOR)
        local = working and self.kind in ("focused", "press", "attend")
        return t < self.breathing_for, local, working and self.kind in ("press", "hand")


@dataclass
class PatchOut:
    held0: list  # per set: knots held when the scored phase starts (bool, N)
    rel_t: list  # per set: when each let go (s from the scored phase's start; nan if it held)
    cycles: list | None = None  # mood: per set, form-and-release cycles at each place
    shortest: list | None = None  # mood: per set, the shortest hold at each place (s; inf if none)


def releases(t: np.ndarray, held: np.ndarray, start: float) -> tuple[np.ndarray, np.ndarray]:
    """From a record of which units hold ([time, unit]): those held just before `start` (the last record before it, so a
    knot let go by the work's first step still counts as held when it began), and when each first let go after it (s
    from `start`; nan if it held throughout)."""
    i0 = max(int(np.searchsorted(t, start, side="left")) - 1, 0)
    held0 = held[i0].astype(bool)
    gone = ~held[i0:].astype(bool) & held0
    first = np.argmax(gone, axis=0)
    return held0, np.where(gone.any(axis=0), np.maximum(t[i0:][first] - start, 0.0), np.nan)


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
    tested_with: np.ndarray | None = None  # per set: the worked knot of the O13 trial held, and let go (the trial ran)
    tested_new: np.ndarray | None = None  # the same for the O8.1 trial
    # O8.2: within BACK_WITHIN s of the worked knot letting go, a knot back at its place, per set; by which route
    # ("same": the same unit held again; "beneath": a unit beneath it held; "beside": an immediate neighbour newly held);
    # how soon (s after the release; nan if none); and whether the trial ran
    back: np.ndarray | None = None
    back_how: dict | None = None
    back_t: np.ndarray | None = None
    tested_back: np.ndarray | None = None


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


# ---------- The parts and their pass criteria (the exam's readings) ----------


@dataclass(frozen=True)
class Part:
    id: str
    obs: str
    says: str
    short: str  # what a theory must do, as a phrase: "it can ..."
    rough: bool = False  # rests on the author's rough impressions (v4): scored and shown, never in the joint pass


PARTS = (
    Part("O17.1", "O17", "A knot is a bump the hand can feel, beneath the skin", "be a bump beneath the skin", rough=True),
    Part("O17.2", "O17", "When a knot lets go its bump goes with it, as a contraction letting go",
         "let its bump go like an unclenching", rough=True),
    Part("O18", "O18", "Pressing or rolling can bring a knot out, over minutes", "bring a knot out by rolling", rough=True),
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
    Part("O2.2", "O2", "Pressed, with a slow out-breath, at least half of knots let go within seconds: under the hand or as it eases off",
         "let a pressed knot go within seconds of breathing out"),
    Part("O3", "O3", "Drinking water eases release, and speeds it", "answer to water"),
    Part("O4.1", "O4", "More stress holds more knots", "hold more knots under more stress"),
    Part("O4.2", "O4", "Knots gather where stress is held", "gather knots where stress is held"),
    Part("O16.1", "O16", "Under breath and mood, a knot forms and lets go at least twice in an hour",
         "let knots come and go with breath and mood"),
    Part("O16.2", "O16", "A knot forms and lets go within a single breath", "form and release a knot within one breath"),
    Part("O5", "O5", "Knots limit movement; a stretch meets them as dull, deep blocks", "limit movement"),
    Part("O6", "O6", "A release brings, within seconds, a brief sensation confined to the knot's own place",
         "spark at the knot's own place as it goes"),
    Part("O8.1", "O8", "After one knot lets go, a new one forms nearby within minutes",
         "form a new knot nearby after a release"),
    Part("O8.2", "O8", "Sometimes, after a knot lets go, a knot is back in the same or a similar spot within 10 minutes",
         "put a knot back in the same spot after a release", rough=True),
    Part("O13", "O13", "Releasing one knot lets three or more others go with it, within seconds",
         "let three or more go with one"),
    Part("O15", "O15", "The unit exists at dozens per square inch and about 100,000 in a body",
         "have a unit as dense as micro knots"),
    Part("O9", "O9", "Working one side eases the other", "ease the other side"),
    Part("O10.1", "O10", "A knot held briefly lets go when its stress ends; one held for hours persists",
         "let a brief knot go and keep an old one"),
    Part("O10.2", "O10", "Knots accumulate with age", "accumulate knots with age"),
)
NOT_RUN_YET = {  # parts no trial can test yet, and why
    "O5": "it needs the mechanics stage (stiffness and stretch)",
    "O18": "it needs a rolling trial in every theory",
    "O9": "it needs the body stage (both sides)",
    "O10.2": "it needs the body stage (a life's accumulation)",
}
BACK_WITHIN = 600.0  # O8.2: "a new knot appears in what seems like the same place", within 10 minutes (v3's reading)
ROUTES = ("same", "beneath", "beside")
GONE_FOR = 2.0  # a knot that is held again sooner never let go: a flicker across the threshold, not a release


class Hand:
    """One hand for every theory's cluster trial. From `start` it presses the worked knot (one per set) until the knot
    lets go and stays let go for GONE_FOR s under it (one held again sooner never let go, so the hand stays), for
    PRESS_FOR s at most; then it lifts and does not come back. `released_at`: when each knot let go (s, on the trial's
    clock; nan if it has not); once the hand has lifted, the first time it lets go, whatever follows (held_again reads
    a return). Found with the motor switch (27 Sep 2026), whose knot, silenced under the hand, could be back the moment
    it lifted, and was being counted as released."""

    def __init__(self, n: int, start: float = 0.0):
        self.start = start
        self.released_at = np.full(n, np.nan)
        self.lifted = np.zeros(n, bool)

    def step(self, t: float, held: np.ndarray) -> np.ndarray:
        """held: per set, whether its worked knot holds at t. Returns per set whether the hand presses at t."""
        if t < self.start:
            return np.zeros(len(self.lifted), bool)
        held = np.asarray(held, bool)
        self.released_at[~self.lifted & held] = np.nan  # held (again) under the hand: it has not let go
        self.released_at[~held & np.isnan(self.released_at)] = t
        with np.errstate(invalid="ignore"):
            self.lifted |= (t >= self.start + PRESS_FOR) | (t >= self.released_at + GONE_FOR)
        return ~self.lifted


def held_again(t: np.ndarray, held: np.ndarray, t_rel: float) -> np.ndarray:
    """O8.2's "same" route for one unit that let go at t_rel: the times (s after it) at which it is held again within
    BACK_WITHIN s, once it has stayed let go for GONE_FOR s. Empty if it is not, or if it came back sooner."""
    if held[(t >= t_rel) & (t < t_rel + GONE_FOR)].any():
        return np.zeros(0)
    later = (t >= t_rel + GONE_FOR) & (t <= t_rel + BACK_WITHIN)
    return t[later][held[later]] - t_rel


def _count(rel: np.ndarray, lo: float, hi: float) -> int:
    return int(((rel >= lo) & (rel < hi)).sum())


def _within_seconds(pressed: SingleOut) -> np.ndarray:
    """Per set: at least half of the knots let go within 10 s of the out-breath's start, during it (O2's readings)."""
    first_out = (pressed.rel_t >= FIRST_OUT) & (pressed.rel_t < FIRST_OUT + 10.0) & pressed.during_out
    n = pressed.formed.sum(axis=1)
    return (np.where(pressed.formed, first_out, False).sum(axis=1) >= 0.5 * n) & (n > 0)


def _single_parts(s: SingleOut, focused: SingleOut, held: SingleOut, eased: SingleOut) -> dict[str, np.ndarray]:
    d = np.array(DEPTHS)
    released = ~np.isnan(s.rel_t)
    deep = d >= DEEP
    spark = released & (s.spark_here >= SPARK) & ~(s.spark_far >= SPARK / 2)
    return {
        "O1.1": s.formed[:, 0] & released[:, 0] & s.during_out[:, 0],
        "O1.3": (s.formed[:, deep] & ~released[:, deep]).all(axis=1) & (~np.isnan(focused.rel_t[:, deep])).any(axis=1),
        # a hand that holds, or one that eases off halfway through the out-breath: either counts (v2)
        "O2.2": _within_seconds(held) | _within_seconds(eased),
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


def score_variant(theory, ps: list[dict], variant: str, meta: dict | None = None) -> dict[str, np.ndarray | str]:
    """Every part for one variant: a pass per parameter set, or SILENT or NOT_RUN. `meta`, if given, receives per set
    whether each trial with a precondition ran at all (its knot formed and let go)."""
    cells: dict[str, np.ndarray | str] = {}
    s = theory.single(ps, variant, DEPTHS, Single())
    f = theory.single(ps, variant, DEPTHS, Single(focus=True))
    cells |= _single_parts(s, f, theory.single(ps, variant, DEPTHS, HELD), theory.single(ps, variant, DEPTHS, EASED))
    kinds = {"one_breath": Patch("one_breath"), "broad": Patch("broad"), "focused": Patch("focused"),
             "press": Patch("press"), "mood": Patch("mood"),
             **{f"hold{x}": Patch("hold", float(x)) for x in ("0.6", "1.0", "1.4")}}
    cells |= _patch_parts({k: theory.patch(ps, variant, pr_) for k, pr_ in kinds.items()})
    c = theory.cluster(ps, variant)
    cells["O8.1"], cells["O13"], cells["O8.2"] = c.new_nearby, c.with_ >= 3, c.back
    if meta is not None:
        meta["tested"] = {"O8.1": c.tested_new, "O8.2": c.tested_back, "O13": c.tested_with}
        meta["back"] = back_summary(c)
    age = theory.ageing(ps, variant)
    cells["O10.1"] = NOT_RUN if age is None else age.brief_released & age.long_persists
    d = theory.density()
    cells["O15"] = np.full(len(ps), d.per_mm2 >= 1 / 25 and d.total >= 1e5) if d is not None else SILENT
    # What the hand feels (O17): read from the theory's own account of what a knot is, the same in every setting
    cells["O17.1"] = np.full(len(ps), bool(theory.FEEL["bump"]))
    cells["O17.2"] = np.full(len(ps), bool(theory.FEEL["unclench"]))
    for pid in NOT_RUN_YET:
        cells[pid] = NOT_RUN
    for pid in theory.SILENT:
        cells[pid] = SILENT
    cells.setdefault("O3", SILENT)
    return cells


HELD = Single(press=True, breaths=9)  # held PRESS_FOR s, lifted, then 30 s more
EASED = Single(press=True, breaths=2, press_for=EASE_AT)


def back_summary(c: ClusterOut) -> dict:
    """Where a knot comes back after a release (O8.2), over the settings whose trial ran: the share by route, the share
    with none, and the median time to the return."""
    ran = c.tested_back
    n = max(int(ran.sum()), 1)
    t = c.back_t[ran & c.back]
    return {"settings": int(ran.sum()), **{r: round(float((c.back_how[r] & ran).sum() / n), 3) for r in ROUTES},
            "none": round(float((ran & ~c.back).sum() / n), 3),
            "median_s": round(float(np.median(t)), 1) if len(t) else None}


def hand(theory, ps: list[dict], variant: str) -> dict:
    """The open question (Q1): when a knot pressed for PRESS_FOR s, then lifted, lets go. Shares of the knots formed,
    over all settings and depths: under the hand; within 5 s of the lift; later; not within 30 s of it."""
    h = theory.single(ps, variant, DEPTHS, HELD)
    r = h.rel_t[h.formed]
    n = max(len(r), 1)
    lifted = (r >= PRESS_FOR) & (r < PRESS_FOR + 5.0)
    return {"knots": int(len(r)), "under": round(float((r < PRESS_FOR).sum() / n), 3),
            "lift": round(float(lifted.sum() / n), 3), "later": round(float((r >= PRESS_FOR + 5.0).sum() / n), 3),
            "held": round(float(np.isnan(r).sum() / n), 3),
            "under_s": round(float(np.median(r[r < PRESS_FOR])), 1) if (r < PRESS_FOR).any() else None}


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
    meta: dict = {}
    cells = score_variant(theory, ps, variant, meta)
    scored = [cells[p.id] for p in PARTS if not p.rough and not isinstance(cells[p.id], str)]  # rough parts: shown only
    joint = np.all(np.array(scored), axis=0) if scored else np.zeros(len(ps), bool)
    return {
        "name": variant,
        "description": theory.VARIANTS[variant],
        "cells": {p.id: (c if isinstance(c := cells[p.id], str) else round(float(np.mean(c)), 3)) for p in PARTS},
        "joint": round(float(joint.mean()), 3),
        "passes": {p.id: cells[p.id].astype(int).tolist() for p in PARTS if not isinstance(cells[p.id], str)},
        "count": count(theory, ps, variant),
        "hand": hand(theory, ps, variant),
        # in how many settings a trial with a precondition ran at all (its knot formed and let go)
        "tested": {pid: None if x is None else round(float(np.mean(x)), 3) for pid, x in meta["tested"].items()},
        "back": meta["back"],
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
    """A hash of everything the exam depends on: the harness, the theories and their models, the parameter tables that
    code loads (found in it, so a table only other studies read does not stale the matrix) and the exam itself.
    matrix.json carries it; a test fails when it is stale."""
    pkg = SIM / "knots_sim"
    code = [pkg / "exam.py", pkg / "adapt.py", pkg / "params.py", *(pkg / "theories").glob("*.py"),
            *(pkg / "models").glob("*.py")]
    tables = {t for f in code for t in re.findall(r'(?:load|values)\("([a-z_]+)"\)', f.read_text())}
    files = [*code, *(SIM / "params" / f"{t}.yaml" for t in tables), SPEC]
    h = hashlib.sha256()
    for f in sorted(files):
        h.update(f.relative_to(SIM).as_posix().encode())
        h.update(f.read_bytes())
    return h.hexdigest()[:12]


def main(workers: int = 4) -> dict:
    from concurrent.futures import ProcessPoolExecutor

    from .export import _git

    exam = spec()
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
        "exam": {"version": exam["version"], "updated": str(exam["updated"]),
                 "sha256": hashlib.sha256(SPEC.read_bytes()).hexdigest()},
        "trials": {"surge_s": SURGE[1] - SURGE[0], "settle_s": T0 - SURGE[1], "breath_s": [INHALE, PERIOD - INHALE], "breath_start_s": START,
                   "breaths": BREATHS, "press_s": PRESS_FOR, "ease_s": EASE_AT, "hold_s": HOLD_FOR, "mood_s": MOOD_FOR,
                   "depths": list(DEPTHS), "patch": PATCH["n"],
                   "samples": K, "seed": SEED},
        "parts": [{"id": p.id, "obs": p.obs, "says": p.says, "short": p.short, "not_run": NOT_RUN_YET.get(p.id),
                   "rough": p.rough} for p in PARTS],
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
