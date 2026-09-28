"""T2, the vascular latch, in the field guide: small arteries in the skin and muscle, each able to latch, as Johnson's
vasocomputation has it (models/latch.py): a contraction clamps its region and cuts it off from awareness, so the
prediction holding it cannot update.

How the scenes map onto it (a new formalisation, written out for its proponents to check):

- Stress tightens the region's vessels directly (stress_tone) and writes a prediction that holds them (w_s). w_s by the
  shared rule: the typical region, where stress is held most, is committed by the surge, kept by the holding stress,
  and not committed by the holding stress alone.
- A slow breath lowers stress; minutes of it calm.
- Attention at a place raises its awareness (attend); a hand brings the region it presses into awareness (press_aware),
  and so does a roller; the clamp cuts awareness down (block).
- A knot is a region held by its prediction and clamped (c > ½, f > ½). It is felt only as far as awareness reaches it:
  unattended, a dull blind spot; attended or pressed, tender. Nothing larger than a small artery stiffens: nothing
  firm for a finger. When it lets go, the latch relaxes over tens of seconds: a slow warming, not a spark.
"""

from __future__ import annotations

import numpy as np
from scipy.stats import qmc

from ..models import latch as lm
from ..params import load
from . import patch, senses
from .base import K, SEED, Frames, Run, calmed, moods, stress, wave
from .scenes import SURGE, SETTLED, Scene

ID, KEY, NAME, GLYPH = "T2", "latch", "Vascular latch", "閂"
DT = 0.1
REST = 0.2  # resting tone of a region's vessels
SETTING_KEYS = ("tau_latch", "gain", "keep_margin", "loop_point", "sharpness", "erode", "update", "block", "aware0", "attend",
                "press_aware", "tau_c", "stress_tone", "hold", "breath_fall")
TABLES = ("latch", "interface")


def _record(med: dict, n: int) -> str:
    fb, fa = med["flow_spot"][1], med["flow_spot"][0]
    return (f"Blood flow at the spot rises slowly, from {fb:.2f} to {fa:.2f} of resting flow over the half minute around its "
            f"release (the median of {n}), as the latch lets go; nothing changes in the muscle's own activity. Before it, "
            f"the region is under-perfused and quiet to the senses.")


WORDS = {
    "stiff": False,
    "bump": "Nothing firm for a finger to find: what stiffens is no larger than a small artery.",
    "bump_cell": "nothing firm",
    "vessel": "clamped artery",
    "inside": "Clamped, the region is cut off from awareness: a dull blind spot, hardly felt until attention or a hand "
              "brings it back, and then tender.",
    "inside_cell": "a dull blind spot",
    "inside_blind": True,
    "where": "Wherever smooth muscle wraps a small artery, in the skin and in the muscle beneath: regions 5 mm apart.",
    "where_cell": "anywhere there are small arteries",
    "units": "Small arteries in the skin and muscle, each able to latch (64 representative)",
    "body": "",
    "forms": "Stress tightens a region's vessels and writes a prediction that holds them; the clamp keeps it written.",
    "rolling": "a roller brings a region into awareness for a moment, which lets a held one update, not a new one form.",
    "breath": "A breath lowers the stress that writes the prediction and tightens the vessels; where the clamp could not keep "
              "the prediction without it, the prediction lets go, and the latch after it.",
    "attention": "Attention brings the region back into awareness, and the prediction updates.",
    "micro": "Attention does the work; the breath's size matters little.",
    "needs_what": "stress at the knot (a calming aimed there)",
    "needs": "Calm reaches the prediction only through the stress that feeds it; awareness updates it directly.",
    "hand": "A hand brings the region into awareness; the prediction updates, and the latch lets go over tens of seconds.",
    "letgo": "The latch relaxes slowly once its command falls.",
    "spark": "",
    "spark_cell": "none: a slow warming",
    "no_spark": "No spark: the latch lets go over tens of seconds, a slow warming as blood returns.",
    "move": "Each region is held by its own prediction: the ones that go with it are the ones the same hand reached. One "
            "freed under a hand that lifts too soon can come back: its vessels, still clamped, write the prediction again.",
    "family": "No trees: each region is held by its own prediction.",
    "time": "What decides it is whether the prediction's own command keeps the clamp past its halfway point once the stress "
            "has gone.",
    "no_time": "",
    "record": _record,
    "record_cell": "flow rises slowly",
    "record_none": "No release of the knot at the spot to record.",
    "scatter": "they sit where stress first wrote a prediction",
}


class Runner:
    def __init__(self, k: int = K, seed: int = SEED):
        self.K = k
        tabs = load("latch") | load("interface")
        keys = tuple(load("latch")) + tuple(load("interface"))
        X = qmc.scale(qmc.Sobol(len(keys), seed=seed).random(k), [tabs[q].range[0] for q in keys],
                      [tabs[q].range[1] for q in keys])
        self.ps = [dict(zip(keys, map(float, x))) | {"seed": seed * 1000 + i} for i, x in enumerate(X)]
        self.se = senses.sample(k, seed)
        depth = np.array([s["skin"] + s["fat"] + s["into_muscle"] / 2 for s in self.se])
        self.depth = depth
        self.lay = patch.arterioles(float(np.median(depth)))
        N = self.lay.n
        self.hold = np.array([p["hold"] for p in self.ps])
        loop, self.loop_ok = lm.derive({q: np.array([p[q] for p in self.ps], float) for q in self.ps[0] if q != "seed"},
                                       self.hold * patch.Z_REF, REST)
        for i, p in enumerate(self.ps):
            p.update({q: float(v[i]) for q, v in loop.items()})
        self.P = {q: np.repeat(np.array([p[q] for p in self.ps], float), N).reshape(k, N) for q in self.ps[0] if q != "seed"}
        z = np.random.default_rng(37).normal(0, 1, N)
        self.zone = self.lay.zone
        self.P["w_s"] = self._scale()[:, None] * np.exp(self.P["spread"] * z[None, :])
        self.under_hand = self.lay.near(patch.SPOT, patch.HAND_R)
        self.rolled = self.lay.in_roll()
        self.roi = self.lay.near(patch.SPOT, patch.ROI_R)
        self.sham = self.lay.near(patch.SHAM, patch.ROI_R)
        self._dS = np.zeros(k)
        self._aim = np.zeros((k, N), bool)
        self._formed = None
        self.vessel_mm, self.vessel_depth = 0.2, float(np.median(depth))  # a small artery, what a finger would meet

    def _scale(self) -> np.ndarray:
        """w_s per setting by the shared rule, for the typical region (median spread, full share): the least that lets
        the surge commit it, and the least that lets the holding stress alone commit it, each still held half an hour
        into the hold; the geometric middle."""
        grid = np.geomspace(1e-4, 10.0, 64)
        Kk, G = self.K, len(grid)
        P = {q: np.repeat(np.array([p[q] for p in self.ps], float), G * 2).reshape(Kk, 2 * G) for q in self.ps[0] if q != "seed"}
        P["w_s"] = np.tile(np.r_[grid, grid], (Kk, 1))
        surged = np.tile(np.r_[np.ones(G, bool), np.zeros(G, bool)], (Kk, 1))
        st = lm.State(c=np.zeros((Kk, 2 * G)), f=np.full((Kk, 2 * G), REST))
        for i in range(int((SETTLED + 1800.0) / DT)):  # half an hour on, so that a slowly fading state is not counted as kept
            t = i * DT
            s = np.where(surged & (SURGE[0] <= t) & (t < SURGE[1]), 1.0, np.where(t < SURGE[0], 0.0, P["hold"]))
            lm.step(P, st, s * patch.Z_REF, 0.0, 0.0, DT, REST)
        held = lm.held(st)
        out = np.full(Kk, 0.05)
        for k in range(Kk):
            made, alone = held[k, :G], held[k, G:]
            if not made.any():
                out[k] = grid[-1]
                continue
            lo = grid[np.argmax(made)]
            hi = grid[np.argmax(alone)] if alone.any() else grid[-1]
            out[k] = float(np.sqrt(lo * max(hi, lo)))
        return out

    def _rest(self) -> lm.State:
        n = (self.K, self.lay.n)
        return lm.State(c=np.zeros(n), f=np.full(n, REST))

    def _integrate(self, scene: Scene, st: lm.State, frames: Frames | None, work=None) -> lm.State:
        P = self.P
        mv_mood = moods(self.ps, scene.duration) if scene.mood else None
        steps = int(round(scene.duration / DT))
        zeros = np.zeros_like(st.c)
        for i in range(steps + 1):
            t = i * DT
            pressing = np.full(self.K, scene.hand(t))
            if work is not None:
                hand, target = work
                pressing = hand.step(t, lm.held(st)[np.arange(self.K), target])
            s = stress(scene, t, self.hold, mv_mood)
            if scene.breathing(t):
                w = wave(scene, t)
                s = s + P["breath_fall"][:, 0] * (P["breath_in_share"][:, 0] * max(w, 0.0) + min(w, 0.0)) \
                    - calmed(scene, t, P["breath_calm"][:, 0], P["tau_calm"][:, 0])
            s_eff = s[:, None] * self.zone[None, :]
            if scene.calm_until and t < scene.calm_until:
                s_eff = s_eff - self._dS[:, None] * self._aim
            att = np.where(scene.attending(t) & self.under_hand[None, :], 1.0, 0.0) + zeros
            press = np.where((pressing[:, None] & self.under_hand[None, :]) | (scene.rolling(t) & self.rolled[None, :]), 1.0, 0.0)
            e = (P["aware0"] + P["attend"] * att + P["press_aware"] * press) * (1 - P["block"] * st.f)
            if frames is not None:
                while frames.due(t):
                    frames.take({"c": st.c.copy(), "f": st.f.copy(), "e": np.clip(e, 0, 1), "s": s.copy(), "hand": pressing.copy()})
            if i == steps:
                break
            lm.step(P, st, s_eff, att, press, DT, REST)
        return st

    def formed(self) -> lm.State:
        if self._formed is None:
            from .scenes import BY_ID

            self._formed = self._integrate(BY_ID["forms"], self._rest(), None)
        f = self._formed
        return lm.State(c=f.c.copy(), f=f.f.copy())

    def run(self, scene: Scene) -> Run:
        from ..exam import Hand

        st = self._rest() if scene.start == "rest" else self.formed()
        held0 = lm.held(st)
        d = ((self.lay.pos - patch.SPOT) ** 2).sum(axis=1)
        target = np.array([int(np.argmin(np.where(held0[k] & self.under_hand, d, np.inf))) if (held0[k] & self.under_hand).any()
                           else self.lay.focal for k in range(self.K)])
        self._aim = np.zeros((self.K, self.lay.n), bool)
        self._aim[np.arange(self.K), target] = True
        frames = Frames(scene.duration, scene.frame)
        work = (Hand(self.K), target) if scene.work else None
        st = self._integrate(scene, st, frames, work)
        if scene.start == "rest":
            self._formed = lm.State(c=st.c.copy(), f=st.f.copy())
        return self._read(scene, frames, target)

    def _read(self, scene: Scene, frames: Frames, target: np.ndarray) -> Run:
        c, f, e = (frames.stack(q) for q in ("c", "f", "e"))
        t = frames.times[: len(c)]
        held = (c > lm.HELD) & (f > lm.HELD)
        # what a finger could feel: a small artery, 0.1 mm in radius, contracted
        k_v = np.array([s["k_vessel"] for s in self.se])
        touch = np.array([s["touch"] for s in self.se])
        bump = senses.felt(k_v[None, :, None] * held, 0.1, 0.1, self.depth[None, :, None], touch[None, :, None])
        tender = f * e / 0.25  # felt only as far as awareness reaches the clamped region
        q = ((1 - 0.6 * f) / (1 - 0.6 * REST)) ** 4  # flow through the region's small arteries, relative to rest
        pick = lambda a: a[:, np.arange(self.K), target]
        roi = lambda mask: q[:, :, mask].mean(axis=2)
        return Run(theory=ID, scene=scene.id, t=t, held=held, bump=bump, tender=tender, active=(f > 0.5) & ~held,
                   events=[], focal={"held_prediction": pick(c), "clamp": pick(f), "awareness": pick(e)},
                   inst={"flow_spot": roi(self.roi), "flow_sham": roi(self.sham)},
                   stress=frames.stack("s"), hand=frames.stack("hand"), target=target)

    def ageing(self) -> tuple[np.ndarray, np.ndarray]:
        """Held half an hour, or three hours, at the holding stress, then the stress ends: is the knot at the spot (the
        typical region, full share) still held an hour later? Per setting. Also keeps, for the three hours, how long after
        the stress ends it lets go (`letgo_after`, s; nan if it stays)."""
        out = []
        for hours in (0.5, 3.0):
            P = {q: np.array([p[q] for p in self.ps], float) for q in self.ps[0] if q != "seed"}
            P["w_s"] = self.P["w_s"][:, 0] * 0 + np.median(self.P["w_s"], axis=1)
            st = lm.State(c=np.zeros(self.K), f=np.full(self.K, REST))
            end = SURGE[1] + hours * 3600.0
            gone = np.full(self.K, np.nan)
            for i in range(int((end + 3600.0) / 1.0)):
                t = i * 1.0
                s = np.where(t < SURGE[0], 0.0, np.where(t < SURGE[1], 1.0, np.where(t < end, P["hold"], 0.0)))
                for _ in range(10):
                    lm.step(P, st, s * patch.Z_REF, 0.0, 0.0, 0.1, REST)
                if t >= end:
                    gone[np.isnan(gone) & ~lm.held(st)] = t + 1.0 - end
            out.append(lm.held(st))
            self.letgo_after = gone
        return out[0], out[1]

    def settings(self) -> np.ndarray:
        return np.array([[p[q] for q in SETTING_KEYS] for p in self.ps])
