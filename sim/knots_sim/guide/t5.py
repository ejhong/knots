"""T5, peripheral nerve sensitivity, in the field guide: nerves of the skin where they pierce the fascia, each sensitised to
its own degree (models/nerve.py).

How the scenes map onto it (a new formalisation, written out for its proponents to check):

- Its sites are sensitised before a scene begins (a neuritis takes weeks to come and go: dilley2008); how much varies
  from site to site (spread). No scene changes that.
- Stress reaches a site two ways: through the sympathetic drive, which changes a sensitised nerve's firing about
  fourteen seconds late and over tens of seconds (devor1994), and through the load of the muscle around it, at once,
  with the stress held there. The scale by the shared rule: the typical site where stress is held most is felt from
  s_on times the holding stress.
- A slow breath lowers stress (both routes: the load at once, the sympathetic drive late); minutes of it calm.
- Attention has no route to the nerve.
- A hand presses the site it covers (palpation, mmHg), which excites a sensitised nerve; past a level it tingles along
  its branches. A roller the same, 1 s in every 3, where it passes.
- A knot is a site felt without touch: its own firing above what is felt as a knot. Nothing is firm; what is felt is
  its firing, and more when pressed.
"""

from __future__ import annotations

import numpy as np
from scipy.stats import qmc

from ..models import nerve as nm
from ..params import load
from . import patch, senses
from .base import K, SEED, Frames, Run, calmed, moods, stress, wave
from .scenes import Scene

ID, KEY, NAME, GLYPH = "T5", "nerve", "Nerves", "神経"
DT = 0.1
SETTING_KEYS = ("symp_delay", "symp_rise", "symp_fall", "symp_share", "on_at", "ongoing", "spread", "press_gain", "tingle",
                "hold", "palpation", "breath_fall")
TABLES = ("nerve", "interface")


def _record(med: dict, n: int) -> str:
    fb, fa = med["nerve_firing"][1], med["nerve_firing"][0]
    return (f"A recording from the nerve would see its firing fall from {fb:.2f} to {fa:.2f} of the level felt as a knot "
            f"over the half minute around its release (the median of {n}), following the sympathetic drive about "
            f"fourteen seconds late; a local anaesthetic at the point would silence it (as at entrapped nerves of the "
            f"abdominal wall, boelens2013). The skin's flow and the muscle's activity do not change.")


WORDS = {
    "stiff": False,
    "bump": "Nothing firm for a finger to find: a nerve of the skin is a millimetre across. Pressed, the point is tender, "
            "and past a level it tingles along the nerve's branches.",
    "bump_cell": "nothing firm; a tender point",
    "inside": "A sensitised nerve firing on its own: an ache or a burn at a fixed point, sometimes spreading along its "
              "branches.",
    "inside_cell": "an ache at a fixed point",
    "where": "Only where a nerve of the skin pierces the fascia, beside the perforator it travels with: a few fixed points, "
             "about 20 mm apart here.",
    "where_cell": "fixed points, at nerves",
    "scatter": "they sit at the nerves' piercings, wherever those are",
    "units": "Nerves of the skin where they pierce the fascia (4 in the patch)",
    "body": "The account counts thousands in a body, about as many as the medium and major perforators.",
    "forms": "Stress excites a sensitised nerve through the sympathetic drive, about fourteen seconds late (devor1994), and "
             "through the load of the muscle around it.",
    "rolling": "a roller presses what it passes; where no nerve pierces there, it excites nothing.",
    "breath": "A slow breath eases the load around the nerve at once and the sympathetic drive about fourteen seconds later.",
    "attention": "The account gives attention no route to the nerve: attention alone changes nothing here.",
    "micro": "Nothing here answers attention; small breaths ease the drive a little.",
    "needs_what": "the stress at the nerve (the muscle's load around it, and the sympathetic drive)",
    "needs": "The sympathetic route answers only after about fourteen seconds (devor1994), so a calming has to last; the "
             "site itself stays sensitised for weeks (dilley2008).",
    "family": "No trees of knots: a nerve's branches spread from its piercing, and pressing the piercing is felt along them.",
    "hand": "Pressing a sensitised nerve excites it: it is felt more under the hand, and past a level it tingles along its "
            "branches. A hand's 20-80 mmHg is also more than slows the blood leaving a nerve (20-30 mmHg, rydevik1981).",
    "letgo": "What goes is its firing: the site stays sensitised, and the knot is felt again, in the same place, when its "
             "drive returns.",
    "spark": "",
    "spark_cell": "a tingle when pressed",
    "no_spark": "No spark at a release. Pressed, a sensitised nerve tingles along its branches: a tingle of pressing, not "
                "of letting go.",
    "move": "Each site answers its own drive; a shared stress moves them together, and a knot comes back where it was, at "
            "the same nerve.",
    "time": "Its firing follows the stress within a minute; the site's sensitivity outlasts it by weeks (dilley2008), so "
            "the knot returns with the stress, in the same place.",
    "no_time": "",
    "record": _record,
    "record_cell": "the nerve's firing falls",
    "record_none": "No release of the knot at the spot to record.",
}


def _sample(k: int, seed: int) -> list[dict]:
    own, shared = load("nerve"), load("interface")
    tabs = own | shared
    keys = tuple(own) + tuple(shared)
    X = qmc.Sobol(len(keys), seed=seed).random(k)
    return [{"seed": seed * 1000 + i} | {q: tabs[q].range[0] + u * (tabs[q].range[1] - tabs[q].range[0])
                                          for q, u in zip(keys, x)} for i, x in enumerate(X)]


class Runner:
    def __init__(self, k: int = K, seed: int = SEED):
        self.K = k
        self.ps = _sample(k, seed)
        self.se = senses.sample(k, seed)
        self.depth = np.array([s["skin"] + s["fat"] for s in self.se])
        self.lay = patch.piercings(float(np.median(self.depth)))
        N = self.lay.n
        self.P = {q: np.repeat(np.array([p[q] for p in self.ps], float), N).reshape(k, N) for q in self.ps[0] if q != "seed"}
        z = np.random.default_rng(43).normal(0, 1, N)
        z[self.lay.focal] = 0.0  # the site at the spot is the typical one: the hand rests on a knot there
        self.S = np.exp(self.P["spread"] * z[None, :])
        self.hold = np.array([p["hold"] for p in self.ps])
        on = np.array([p["on_at"] for p in self.ps])
        f0 = np.array([p["ongoing"] for p in self.ps])
        phi = np.array([p["symp_share"] for p in self.ps])
        self.A = ((1 - f0) / (on * self.hold * (phi + (1 - phi) * patch.Z_REF)))[:, None]  # the shared rule
        self.zone = self.lay.zone
        self.under_hand = self.lay.near(patch.SPOT, patch.HAND_R)
        self.rolled = self.lay.in_roll()
        self._dS = np.zeros(k)
        self._aim = np.zeros((k, N), bool)
        self._formed = None
        self.vessel_mm, self.vessel_depth = 0.0, float(np.median(self.depth))

    def _rest(self) -> np.ndarray:
        return np.zeros((self.K, self.lay.n))

    def _integrate(self, scene: Scene, sig: np.ndarray, frames: Frames | None, work=None, events: list | None = None):
        P = self.P
        mv_mood = moods(self.ps, scene.duration) if scene.mood else None
        steps = int(round(scene.duration / DT))
        late = nm.Delay(P["symp_delay"][:, 0], sig.shape, DT)
        for _ in range(late.lag.max() + 1):  # the stress before the scene began: what the drive already follows
            late.push(sig)
        was = np.zeros_like(sig, bool)
        for i in range(steps + 1):
            t = i * DT
            s = stress(scene, t, self.hold, mv_mood)
            if scene.breathing(t):
                w = wave(scene, t)
                s = s + P["breath_fall"][:, 0] * (P["breath_in_share"][:, 0] * max(w, 0.0) + min(w, 0.0)) \
                    - calmed(scene, t, P["breath_calm"][:, 0], P["tau_calm"][:, 0])
            s_site = s[:, None] + np.zeros_like(sig)
            if scene.calm_until and t < scene.calm_until:  # the knot's own drive lowered, aimed at it alone
                s_site = s_site - self._dS[:, None] * self._aim
            s_eff = s_site * self.zone[None, :]
            own = nm.firing(P, self.S, sig, s_eff, self.A)
            pressing = np.full(self.K, scene.hand(t))
            if work is not None:
                hand, target = work
                pressing = hand.step(t, own[np.arange(self.K), target] > 1.0)
            press = np.where((pressing[:, None] & self.under_hand[None, :]) | (scene.rolling(t) & self.rolled[None, :]),
                             P["palpation"], 0.0)
            total = own + self.S * P["press_gain"] * press / 40.0
            if events is not None:
                for k, j in zip(*np.nonzero((press > 0) & ~was & (total >= P["tingle"]))):
                    events.append({"k": int(k), "unit": int(j), "t": t, "kind": "tingle", "size": float(min(total[k, j] / P["tingle"][k, j] - 1, 1.0))})
            was = press > 0
            if frames is not None:
                while frames.due(t):
                    frames.take({"sig": sig.copy(), "own": own.copy(), "total": total.copy(), "s": s.copy(), "hand": pressing.copy()})
            if i == steps:
                break
            sig = nm.follow(sig, np.maximum(late.push(s_site), 0.0), P["symp_rise"], P["symp_fall"], DT)
        return sig

    def formed(self) -> np.ndarray:
        if self._formed is None:
            from .scenes import BY_ID

            self._formed = self._integrate(BY_ID["forms"], self._rest(), None)
        return self._formed.copy()

    def run(self, scene: Scene) -> Run:
        from ..exam import Hand

        sig = self._rest() if scene.start == "rest" else self.formed()
        s0 = (np.zeros(self.K) if scene.start == "rest" else self.hold)[:, None] * self.zone[None, :]
        held0 = nm.firing(self.P, self.S, sig, s0, self.A) > 1.0
        d = ((self.lay.pos - patch.SPOT) ** 2).sum(axis=1)
        target = np.array([int(np.argmin(np.where(held0[k] & self.under_hand, d, np.inf))) if (held0[k] & self.under_hand).any()
                           else self.lay.focal for k in range(self.K)])
        self._aim = np.zeros((self.K, self.lay.n), bool)
        self._aim[np.arange(self.K), target] = True
        frames = Frames(scene.duration, scene.frame)
        work = (Hand(self.K), target) if scene.work else None
        events: list = []
        sig = self._integrate(scene, sig, frames, work, events if scene.film else None)
        if scene.start == "rest":
            self._formed = sig.copy()
        return self._read(scene, frames, target, events)

    def _read(self, scene: Scene, frames: Frames, target: np.ndarray, events: list) -> Run:
        sig, own, total = (frames.stack(q) for q in ("sig", "own", "total"))
        t = frames.times[: len(own)]
        pick = lambda a: a[:, np.arange(self.K), target]
        return Run(theory=ID, scene=scene.id, t=t, held=own > 1.0, bump=np.zeros_like(own), tender=np.clip(total, 0, None),
                   active=(total > 1.0) & ~(own > 1.0), events=events,
                   focal={"firing": pick(own), "pressed": pick(total - own), "sympathetic": pick(sig)},
                   inst={"nerve_firing": pick(total), "sympathetic": pick(sig)},
                   stress=frames.stack("s"), hand=frames.stack("hand"), target=target)

    def ageing(self) -> tuple[np.ndarray, np.ndarray]:
        """The typical site held at the holding stress half an hour, or three hours; then the stress ends. Is it still felt
        an hour later? (Its sensitivity is taken to outlast the scene, as it lasts weeks.)"""
        P = {q: np.array([p[q] for p in self.ps], float) for q in self.ps[0] if q != "seed"}
        out = []
        for hours in (0.5, 3.0):
            sig = self.hold.copy()  # the drive has long followed the holding stress
            end = hours * 3600.0
            late = nm.Delay(P["symp_delay"], (self.K,), 1.0)
            for _ in range(late.lag.max() + 1):
                late.push(sig)
            for i in range(int((end + 3600.0) / 1.0)):
                s = self.hold * patch.Z_REF if i < end else np.zeros(self.K)
                sig = nm.follow(sig, late.push(s), P["symp_rise"], P["symp_fall"], 1.0)
            own = P["ongoing"] + self.A[:, 0] * (P["symp_share"] * sig + (1 - P["symp_share"]) * s)
            out.append(own > 1.0)
        return out[0], out[1]

    def settings(self) -> np.ndarray:
        return np.array([[p[q] for q in SETTING_KEYS] for p in self.ps])
