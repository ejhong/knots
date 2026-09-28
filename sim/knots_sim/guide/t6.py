"""T6, perception, in the field guide: places on the body map, felt as knots when what is felt there crosses a threshold
(models/perception.py).

How the scenes map onto it (the exam's mapping, theories/t6.py, written out for its proponents to check):

- Stress is what arousal follows; where stress is held, ordinary input is raised (guarding). The scale of ordinary input
  by the shared rule (`theories.t6._scale`): the typical place where stress is held most sits in the middle of its window.
- A slow breath eases arousal and is felt as safety; the in-breath lowers what is felt a little.
- Attention at a place raises what is felt there at once and, with the breath, quiets it over time.
- A hand adds input at the places under it; a roller the same, 1 s in every 3.
- A knot is a place felt as one. Nothing in the tissue changes: no bump; what is felt there is its tenderness. Its
  tingling comes only from overbreathing, everywhere at once, which slow breaths do not make.
"""

from __future__ import annotations

import numpy as np

from ..exam import breath_wave
from ..models.perception import State
from ..theories import t6 as adapter
from . import patch, senses
from .base import K, SEED, Frames, Run, calmed, moods, stress, wave
from .scenes import Scene

ID, KEY, NAME, GLYPH = "T6", "central", "Perception", "覚"
DT = 0.1


SETTING_KEYS = ("kappa", "tau_arousal", "attention_gain", "tau_extinct", "cpm", "hysteresis", "guard", "press_gain", "hold",
                "breath_fall")
TABLES = ("perception", "interface")


def _record(med: dict, n: int) -> str:
    return ("Nothing in the tissue changes: skin flow, muscle activity and stiffness stay as they were. Only the report "
            f"changes: what is felt at the spot falls from {med['felt'][1]:.2f} to {med['felt'][0]:.2f} of the level felt "
            f"as a knot (the median of {n} releases).")


WORDS = {
    "stiff": False,
    "bump": "Nothing firm for a finger to find: nothing in the tissue changes. What a finger meets is an ordinary structure, "
            "felt more.",
    "bump_cell": "nothing firm",
    "stiff_none": "Nothing at the knot resists a stretch: nothing in the tissue changes.",
    "rolled": "Each pass is felt: the place is louder while it is rolled.",
    "no_warmth": "The model gives warmth no route; that a warm shower calms arousal is not modelled.",
    "inside": "Felt from inside is all it is: a place the nervous system turns up.",
    "inside_cell": "all it is",
    "tender": "What is felt there is turned up by arousal, guarding and attention: tenderness is all it is.",
    "where": "Wherever the body map tells places apart, about 10 mm on the back: broad and soft-edged.",
    "where_cell": "anywhere; broad",
    "scatter": "they sit where ordinary input happens to be loudest, and arousal raises every place at once",
    "units": "Places on the body map, about 10 mm apart",
    "body": "",
    "forms": "Arousal turns up what is felt, most where stress is held and the muscles guard.",
    "rolling": "a press is felt while it lasts.",
    "breath": "A slow breath eases arousal and is felt as safety; the in-breath is felt a little less.",
    "attention": "Attention first turns up what is felt there, then, with the breath, quiets it.",
    "micro": "Attention with safety quiets a place whatever the breath's size.",
    "needs_what": "arousal, everywhere at once (perception has no drive of its own at a place)",
    "needs": "What is felt follows arousal and attention; sensitisation keeps a place loud after arousal falls.",
    "family": "No trees: places on the body map are not branches of one another.",
    "hand": "A hand adds input and draws attention: the place is felt more under it.",
    "letgo": "What goes is what is felt.",
    "spark": "",
    "spark_cell": "none at a release",
    "no_spark": "No tingle at a release: its tingling comes only from overbreathing, in the hands, face and trunk at once.",
    "move": "Attention moves to the next loudest place, and the loudest knot quiets the others.",
    "time": "",
    "no_time": "",
    "record": _record,
    "record_cell": "nothing in the tissue",
    "record_none": "Nothing in the tissue changes; no release of the knot at the spot to time.",
}

class Runner:
    def __init__(self, k: int = K, seed: int = SEED):
        self.K = k
        self.ps = adapter.sample(k, seed)
        self.se = senses.sample(k, seed)
        self.lay = patch.places(10.0)
        N = self.lay.n
        self.P = {q: np.array([p[q] for p in self.ps], float) for q in self.ps[0] if q != "seed"}
        self.Pp = {q: np.repeat(v, N).reshape(k, N) for q, v in self.P.items()}
        z = np.random.default_rng(11).normal(0, 1, N)
        self.b = np.exp(self.P["input_sd"][:, None] * z[None, :])
        self.zone = self.lay.zone
        self.under_hand = self.lay.near(patch.SPOT, patch.HAND_R)
        self.rolled = self.lay.in_roll()
        self._dS = np.zeros(k)  # a calming aimed at the knot (the envelope), per setting
        self._aim = np.zeros((k, self.lay.n), bool)
        self._formed = None

    def _rest(self):
        n = (self.K, self.lay.n)
        return State(a=np.zeros(self.K), g=np.ones(n), h=np.zeros(n, bool), F=np.zeros(n))

    def _integrate(self, scene: Scene, st: State, frames: Frames | None, work=None) -> State:
        P, Pp = self.P, self.Pp
        mv_mood = moods(self.ps, scene.duration) if scene.mood else None
        g0 = np.ones_like(st.g)
        rolled = self.under_hand if scene.roll_at == "spot" else self.rolled
        steps = int(round(scene.duration / DT))
        for i in range(steps + 1):
            t = i * DT
            pressing = np.full(self.K, scene.hand(t))
            if work is not None:
                hand, target = work
                pressing = hand.step(t, st.h[np.arange(self.K), target])
            s = stress(scene, t, P["hold"], mv_mood)
            if frames is not None:
                while frames.due(t):
                    frames.take({"F": st.F.copy(), "h": st.h.copy(), "g": st.g.copy(), "a": st.a.copy(), "s": s.copy(),
                                 "hand": pressing.copy()})
            if i == steps:
                break
            if scene.calm_until and t < scene.calm_until:  # perception has no local drive: arousal, everywhere
                s = s - self._dS
            breathing = scene.breathing(t)
            w = wave(scene, t)
            if breathing:
                s = s - calmed(scene, t, P["breath_calm"], P["tau_calm"])
            att = np.where(scene.attending(t) & self.under_hand[None, :], 1.0, 0.0) + np.zeros_like(st.F)
            att = np.where(pressing[:, None] & self.under_hand[None, :], 1.0, att)  # a hand draws attention to itself
            press = np.where((pressing[:, None] & self.under_hand[None, :]) | (scene.rolling(t) & rolled[None, :]),
                             P["palpation"][:, None], 0.0)
            drive = s + (P["breath_fall"] * (P["breath_in_share"] * max(w, 0.0) + min(w, 0.0)) if breathing else 0.0)
            st.a = st.a + DT * (drive - st.a) / P["tau_arousal"]
            G = 1.0 + Pp["kappa"] * np.maximum(st.a, 0.0)[:, None]
            u = Pp["u_scale"] * self.b * (1 + Pp["guard"] * np.maximum(s, 0.0)[:, None] * self.zone[None, :]) \
                + Pp["press_gain"] * press / 40.0
            excess = np.clip(st.F - 1.0, 0.0, 1.0) * st.h
            top = excess.max(axis=1, keepdims=True)
            second = np.sort(excess, axis=1)[:, -2:-1] if excess.shape[1] > 1 else np.zeros_like(top)
            other = np.where(excess >= top, second, top)  # the loudest other knot
            F = G * st.g * u * (1 + Pp["attention_gain"] * att) * (1 - Pp["phase_amp"] * max(w, 0.0)) * (1 - Pp["cpm"] * other)
            h = np.where(F > 1.0, True, np.where(F < 1.0 - Pp["hysteresis"], False, st.h))
            faded = (st.h & ~h).any(axis=1)
            st.a = st.a - P["relief"] * faded
            st.g = st.g + DT * (h * (g0 * (1 + Pp["sens_max"]) - st.g) / Pp["tau_sens"]
                                - att * (1.0 if breathing else 0.0) * (st.g - g0 / 2) / Pp["tau_extinct"])
            st.h, st.F = h, F
        return st

    def formed(self) -> State:
        if self._formed is None:
            from .scenes import BY_ID

            self._formed = self._integrate(BY_ID["forms"], self._rest(), None)
        f = self._formed
        return State(a=f.a.copy(), g=f.g.copy(), h=f.h.copy(), F=f.F.copy())

    def run(self, scene: Scene) -> Run:
        from ..exam import Hand

        st = self._rest() if scene.start == "rest" else self.formed()
        d = ((self.lay.pos - patch.SPOT) ** 2).sum(axis=1)
        target = np.array([int(np.argmin(np.where(st.h[k] & self.under_hand, d, np.inf))) if (st.h[k] & self.under_hand).any()
                           else self.lay.focal for k in range(self.K)])
        frames = Frames(scene.duration, scene.frame)
        work = (Hand(self.K), target) if scene.work else None
        st = self._integrate(scene, st, frames, work)
        if scene.start == "rest":
            self._formed = State(a=st.a.copy(), g=st.g.copy(), h=st.h.copy(), F=st.F.copy())
        return self._read(scene, frames, target)

    def _read(self, scene: Scene, frames: Frames, target: np.ndarray) -> Run:
        F, h, g = (frames.stack(q) for q in ("F", "h", "g"))
        a = frames.stack("a")
        t = frames.times[: len(F)]
        tender = np.clip(F, 0, None)  # what is felt there: 1 is felt as a knot
        pick = lambda x: x[:, np.arange(self.K), target]
        return Run(theory=ID, scene=scene.id, t=t, held=h, bump=np.zeros_like(F), tender=tender, active=np.zeros_like(h),
                   events=[], focal={"felt": pick(F), "gain": pick(g), "arousal": a},
                   inst={"felt": pick(F)}, stress=frames.stack("s"), hand=frames.stack("hand"), target=target)

    def settings(self) -> np.ndarray:
        keys = ("kappa", "tau_arousal", "attention_gain", "tau_extinct", "cpm", "hysteresis", "guard", "press_gain", "hold",
                "breath_fall")
        return np.array([[p[q] for q in keys] for p in self.ps])
