"""T7, the motor switch, in the field guide: motor units that latch on and are kept on by their own metabolites
(models/motorswitch.py), their territories lying under the patch.

How the scenes map onto it (the exam's mapping, theories/t7.py, written out for its proponents to check):

- Stress is the descending drive to the pool, times each place's share of it, times a scale U by the shared rule: the
  typical unit (median threshold) where stress is held most (share Z_REF) is recruited by the surge, kept by the
  holding stress with its loop, and not recruited by the holding stress alone. Monoamine facilitation follows stress.
- A slow breath lowers stress, so drive and facilitation fall with it; minutes of it calm.
- Attention at a place inhibits its units (focused local inhibition).
- A hand excites the units under it for a moment and then, held, inhibits them (the variant "inhibit"; the other
  variant, a hand that only excites, is run for the character). A roller excites, 1 s in every 3.
- A knot is a unit held on by its latch and loop alone: firing that its present drive would not start. A unit firing
  because its drive is above threshold is tension, not a knot. Every firing unit stiffens its territory, a long thin
  band along the fibres, felt through skin and fat as senses.py says; its metabolites are its tenderness.
"""

from __future__ import annotations

import numpy as np

from ..models import motorswitch as ms
from ..theories import t7 as adapter
from . import patch, senses
from .base import K, SEED, Frames, Run, calmed, moods, stress, wave
from .scenes import Scene

ID, KEY, NAME, GLYPH = "T7", "motor-switch", "Motor switch", "握"
DT = 0.1


SETTING_KEYS = ("H", "tau_M", "k_w", "spread", "g_m", "tau_m", "squeeze", "g_n", "press_gain", "focus_inhibit", "hold",
                "breath_fall")
TABLES = ("motorswitch", "interface")


def _record(med: dict, n: int) -> str:
    ub, ua = med["emg_units"][1], med["emg_units"][0]
    sb, sa = med["stiffness"][1], med["stiffness"][0]
    return (f"Surface EMG that picks out single motor units sees the knot's unit fall silent at the moment it lets go "
            f"({ub:.0f} units firing under the electrode before, {ua:.0f} after, the median of {n} releases), and "
            f"elastography sees the firmness at the spot fall from {sb:.1f} to {sa:.1f} times the edge of touch. The skin's "
            f"flow does not change.")


WORDS = {
    "stiff": True,
    "bump": "A firm band along the fibres, 5-10 mm wide and a few centimetres long: a motor unit's territory contracted. "
            "Overlapping units make it firmer.",
    "bump_cell": "a firm band along the fibres",
    "inside": "Its contraction and its metabolites are sensed by the muscle's own sensors: a clench or an ache, felt from inside.",
    "inside_cell": "a clench, an ache",
    "layer": "in the muscle",
    "tender": "The metabolites of its own contraction build up in its territory.",
    "where": "In the muscle, wherever its motor units lie: territories 5 mm apart and overlapping.",
    "where_cell": "in muscle, anywhere",
    "units": "Motor units whose territories lie under the patch (64 representative)",
    "body": "",
    "forms": "Stress recruits motor units; some latch on and keep firing after the stress eases, kept on by the "
             "metabolites of their own contraction.",
    "rolling": "the roller excites the units it presses, but where the drive is far below their threshold none latches.",
    "breath": "The breath lowers the descending drive and the monoamines that deepen the latch.",
    "attention": "Attention at a place inhibits its units.",
    "micro": "Attention inhibits the units at the spot whatever the breath's size; the breath itself adds little.",
    "needs_what": "the unit's input (a fall in drive, or inhibition, such as attention's)",
    "needs": "The latch holds a unit on at a small share of the input that recruited it: the input must fall far below that.",
    "family": "Motor units are not arranged in trees: neighbours share only their metabolites' drive.",
    "hand": "A held hand excites the units under it for a moment and then inhibits them (which a hand does is not known; "
            "the other variant follows).",
    "letgo": "The unit falls silent and its fibres relax: an unclenching.",
    "spark": "",
    "spark_cell": "none",
    "no_spark": "No tingle at a release: nothing in a motor unit falling silent makes one.",
    "move": "Neighbouring units share the metabolites' drive, so a latched unit can hand its load to one nearby.",
    "time": "",
    "no_time": "",
    "record": _record,
    "record_cell": "a motor unit falls silent",
    "record_none": "No release of the knot at the spot to record.",
}

class Runner:
    def __init__(self, k: int = K, seed: int = SEED, variant: str = "inhibit"):
        self.K = k
        self.variant = variant
        self.ps = adapter.sample(k, seed)
        self.se = senses.sample(k, seed)
        depth = np.array([s["skin"] + s["fat"] + s["into_muscle"] for s in self.se])
        self.depth = depth
        self.lay = patch.territories(float(np.median(depth)))
        N = self.lay.n
        self.P = {q: np.repeat(np.array([p[q] for p in self.ps], float), N).reshape(k, N) for q in self.ps[0] if q != "seed" and q != "U"}
        z = np.random.default_rng(31).normal(0, 1, N)
        self.theta = np.exp(self.P["spread"] * z[None, :])
        self.zone = self.lay.zone
        self.U = self._scale()
        d = np.sqrt(((self.lay.pos[:, None, :] - self.lay.pos[None, :, :]) ** 2).sum(-1))
        nb = (d > 0) & (d <= 7.5)  # neighbours: within one and a half spacings (5 mm)
        self.NB = nb / np.maximum(nb.sum(axis=1, keepdims=True), 1)
        self.under_hand = self.lay.near(patch.SPOT, patch.HAND_R)
        self.rolled = self.lay.in_roll()
        # what a unit's territory is, felt: across the fibres its measured width; along them, a long band
        self.a_across = np.array([s["territory"] for s in self.se])[:, None] / 2 * (self.lay.a_across / self.lay.a_across.mean())[None, :]
        self.a_along = np.array([s["unit_length"] for s in self.se])[:, None] / 2 * np.ones(N)[None, :]
        self._dS = np.zeros(k)  # a calming aimed at the knot (the envelope), per setting
        self._aim = np.zeros((k, self.lay.n), bool)
        self._formed = None

    def _scale(self) -> np.ndarray:
        out = np.zeros(self.K)
        for k, p in enumerate(self.ps):
            L = float(ms.latch(p, p["hold"], 1.0))
            lo = max(1 / patch.Z_REF, (L - p["g_m"] * p["squeeze"]) / (p["hold"] * patch.Z_REF))
            hi = 1 / (p["hold"] * patch.Z_REF)
            out[k] = float(np.sqrt(lo * max(hi, lo * 1.0001)))
        return out

    def _rest(self) -> ms.State:
        n = (self.K, self.lay.n)
        return ms.State(on=np.zeros(n, bool), M=np.zeros(n), w=np.zeros(n), m=np.zeros(n), D=np.zeros(n))

    def _hand(self, held_for: float, variant: str) -> np.ndarray:
        size = self.P["press_gain"] * self.P["palpation"] / 40.0
        if variant == "inhibit":
            return np.where(held_for < self.P["inhibit_after"], size, -size)
        return size

    def _integrate(self, scene: Scene, st: ms.State, frames: Frames | None, work=None, variant: str | None = None):
        variant = variant or self.variant
        P = self.P
        mv_mood = moods(self.ps, scene.duration) if scene.mood else None
        hold = P["hold"][:, 0]
        steps = int(round(scene.duration / DT))
        since = np.full(self.K, -1.0)  # when the hand landed, per setting
        for i in range(steps + 1):
            t = i * DT
            pressing = np.full(self.K, scene.hand(t))
            if work is not None:
                hand, target = work
                pressing = hand.step(t, (st.on & (st.D < self.theta))[np.arange(self.K), target])
            since = np.where(pressing & (since < 0), t, np.where(pressing, since, -1.0))
            s = stress(scene, t, hold, mv_mood)
            latched = st.on & (st.D < self.theta)
            if frames is not None:
                while frames.due(t):
                    frames.take({"on": st.on.copy(), "latched": latched.copy(), "m": st.m.copy(), "M": st.M.copy(),
                                 "D": st.D.copy(), "s": s.copy(), "hand": pressing.copy()})
            if i == steps:
                break
            if scene.breathing(t):
                w = wave(scene, t)
                s = s + P["breath_fall"][:, 0] * (P["breath_in_share"][:, 0] * max(w, 0.0) + min(w, 0.0)) \
                    - calmed(scene, t, P["breath_calm"][:, 0], P["tau_calm"][:, 0])
            drive = s[:, None] * self.zone[None, :] * self.U[:, None]
            if scene.calm_until and t < scene.calm_until:  # the knot's own drive lowered, aimed at it alone
                drive = drive - (self._dS[:, None] * self.zone[None, :] * self.U[:, None]) * self._aim
            extra = np.zeros_like(drive)
            if scene.attending(t):
                extra = extra - np.where(self.under_hand[None, :], P["focus_inhibit"], 0.0)
            hand_in = self._hand(np.maximum(t - since, 0.0)[:, None], variant)
            extra = extra + np.where(pressing[:, None] & self.under_hand[None, :], hand_in, 0.0)
            if scene.rolling(t):
                extra = extra + np.where(self.rolled[None, :], P["press_gain"] * P["palpation"] / 40.0, 0.0)
            st.D = st.D + DT * (drive - st.D) / P["tau_d"]
            st.M = st.M + DT * (np.clip(s, 0, None)[:, None] - st.M) / P["tau_M"]
            loop = P["g_m"] * st.m + P["g_n"] * (st.m @ self.NB.T)
            total = st.D + extra + loop
            st.on = np.where(st.on, total > self.theta * ms.latch(P, st.M, st.w), total > self.theta)
            st.w = st.w + DT * (st.on - st.w) / P["tau_w"]
            st.m = st.m + DT * (P["squeeze"] * st.on - st.m) / P["tau_m"]
        return st

    def formed(self) -> ms.State:
        if self._formed is None:
            from .scenes import BY_ID

            self._formed = self._integrate(BY_ID["forms"], self._rest(), None)
        f = self._formed
        return ms.State(on=f.on.copy(), M=f.M.copy(), w=f.w.copy(), m=f.m.copy(), D=f.D.copy())

    def run(self, scene: Scene, variant: str | None = None) -> Run:
        from ..exam import Hand

        st = self._rest() if scene.start == "rest" else self.formed()
        latched = st.on & (st.D < self.theta)
        d = ((self.lay.pos - patch.SPOT) ** 2).sum(axis=1)
        target = np.array([int(np.argmin(np.where(latched[k] & self.under_hand, d, np.inf))) if (latched[k] & self.under_hand).any()
                           else self.lay.focal for k in range(self.K)])
        self._aim = np.zeros((self.K, self.lay.n), bool)
        self._aim[np.arange(self.K), target] = True
        frames = Frames(scene.duration, scene.frame)
        work = (Hand(self.K), target) if scene.work else None
        st = self._integrate(scene, st, frames, work, variant)
        if scene.start == "rest" and variant in (None, self.variant):
            self._formed = ms.State(on=st.on.copy(), M=st.M.copy(), w=st.w.copy(), m=st.m.copy(), D=st.D.copy())
        return self._read(scene, frames, target)

    def _read(self, scene: Scene, frames: Frames, target: np.ndarray) -> Run:
        on, latched, m, M, D = (frames.stack(q) for q in ("on", "latched", "m", "M", "D"))
        t = frames.times[: len(on)]
        k_u = np.array([s["k_unit"] for s in self.se])
        touch = np.array([s["touch"] for s in self.se])
        bump = senses.felt(k_u[None, :, None] * on, self.a_along[None], self.a_across[None], self.depth[None, :, None],
                           touch[None, :, None])
        tender = m / np.array([s["tender_metab"] for s in self.se])[None, :, None]
        pick = lambda a: a[:, np.arange(self.K), target]
        # surface EMG over the spot: the units whose territory lies under it, firing
        cover = self.lay.near(patch.SPOT, patch.ROI_R + 3.0)
        return Run(theory=ID, scene=scene.id, t=t, held=latched, bump=bump, tender=tender, active=on & ~latched,
                   events=[], focal={"firing": pick(on).astype(float), "metabolites": pick(m), "facilitation": pick(M),
                                     "drive": pick(D) / self.theta[np.arange(self.K), target][None, :]},
                   inst={"emg_units": on[:, :, cover].sum(axis=2).astype(float), "stiffness": self._felt_at_spot(bump)},
                   stress=frames.stack("s"), hand=frames.stack("hand"), target=target)

    def _felt_at_spot(self, bump: np.ndarray) -> np.ndarray:
        """How firm the spot itself is to a hand, frame by frame: every firing unit's band, summed there."""
        wa, wx = senses.widths(self.a_along, self.a_across, self.depth[:, None])
        out = np.zeros(bump.shape[:2])
        for k in range(self.K):
            out[:, k] = senses.field(patch.SPOT[None, :], self.lay.pos, bump[:, k], wa[k], wx[k])[:, 0]
        return out

    def settings(self) -> np.ndarray:
        keys = ("H", "tau_M", "k_w", "spread", "g_m", "tau_m", "squeeze", "g_n", "press_gain", "focus_inhibit", "hold",
                "breath_fall")
        return np.array([[p[q] for q in keys] for p in self.ps])
