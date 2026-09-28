"""T4, fascial densification, in the field guide: the gliding layer between the fasciae, in patches, each rebuilding its
structure at rest and losing it under shear (models/densification.py).

How the scenes map onto it (a new formalisation, written out for its proponents to check):

- Its knots are there before a scene begins. The account has densification build with immobility, so a layer left still
  (a night) is taken as fully built, and a working day at the holding stress (eight hours) frees it wherever the
  movement is enough. Every scene starts from that; a stressful moment can add to it.
- Stress stills the layer (guarding): its movement falls as exp(−g s) with the stress held at each place. The movement's
  scale by the shared rule: at the typical place, where stress is held most, the holding stress leaves the layer in the
  middle of its band (in log), where a jammed patch stays jammed and a fluid one stays fluid; the surge stills it more.
- A slow breath moves the layer a little (breath_move); its calm, over minutes, eases the guarding.
- Attention has no route to the layer.
- A resting hand warms the layer beneath it (hand_warm, over tau_warm) and does not slide it. A hand working the skin in
  small circles (the variant "friction": the account's deep friction) shears it; a roller shears it, 1 s in every 3.
- A knot is a jammed patch (past the fold of its jammed branch). Nothing there is firmer to press: a finger finds it by
  sliding the skin, which does not slide there. Movement pulling on a stuck patch strains the fascia's nerve endings: its
  tenderness. When one gives way the layers slide again: an ultrasound that tracks their sliding would see it.
"""

from __future__ import annotations

import numpy as np
from scipy.stats import qmc

from ..models import densification as dm
from ..params import load
from . import patch, senses
from .base import K, SEED, Frames, Run, calmed, moods, moved, stress, wave
from .scenes import SURGE, Scene

ID, KEY, NAME, GLYPH = "T4", "densification", "Densification", "膠"
DT = 0.25  # s; the step is linearly implicit, and the roller's pass (1 s) is the fastest thing
DAY = 8 * 3600.0  # s: a working day at the holding stress after a still night, before any scene
SETTING_KEYS = ("theta", "steep", "x_max", "guard", "spread", "breath_move", "roll_shear", "warm_coeff", "hand_warm",
                "tau_warm", "tender_k", "hold", "breath_fall")
TABLES = ("densification", "interface")


def _record(med: dict, n: int) -> str:
    gb, ga = med["glide_spot"][1], med["glide_spot"][0]
    return (f"Ultrasound that tracks the layers sliding over each other (as measured in the back, langevin2011) sees the "
            f"sliding at the spot rise from {gb:.2f} to {ga:.2f} of a free layer's over the half minute around its release "
            f"(the median of {n}); the skin's flow and the muscle's activity do not change.")


WORDS = {
    "stiff": False,
    "bump": "Nothing firm for a finger to find: what changes is how the layers slide. A finger that slides the skin finds "
            "it held there, over a patch a centimetre or more across.",
    "bump_cell": "nothing firm; the skin does not slide",
    "inside": "The layers stop gliding, so movement pulls on the fascia's nerve endings where they are stuck: an ache or a "
              "pull when moving, quiet when still.",
    "inside_cell": "a pull when moving",
    "where": "In the gliding layer between the fasciae, wherever movement is least: broad patches, not points.",
    "where_cell": "in the gliding layer; broad",
    "scatter": "they sit where the layer happens to move least",
    "units": "Patches of the gliding layer, 5 mm across (64 representative); a knot is a connected region of stuck ones",
    "regions": True,
    "body": "The account counts tens to hundreds of such patches in a body, each centimetres across.",
    "chronic": "They are there before any stressful moment: a layer left still (a night) jams, and a day's movement frees it "
               "only where it moves enough.",
    "forms": "Left still, the layer rebuilds its structure and thickens; movement breaks it down again. Where stress "
             "stills the layer, it jams.",
    "rolling": "a roller shears the layer, which breaks its structure down: it frees, it does not make.",
    "breath": "The breath's movement shears the layer a little, and its calm eases the guarding, so the layer moves more.",
    "attention": "The account gives attention no route to the layer: attention alone changes nothing here.",
    "micro": "Nothing here answers attention, and small breaths hardly move the layer.",
    "needs_what": "the stress that stills the layer (its guarding)",
    "needs": "A jammed patch gives way only when movement shears it past its band, and then slowly at first: calm helps "
             "only by letting the layer move.",
    "family": "No trees: the layer's patches are not branches of one another. The fascial chains along which the account "
              "has densification travel are not modelled yet.",
    "hand": "A resting hand warms the layer a little and does not slide it; warmth thins hyaluronan by about 2% a degree "
            "(cowman2015).",
    "hand_variant": "If the hand worked the skin in small circles instead of resting (deep friction, the account's own way), "
                    "it would let go under the hand",
    "letgo": "A jammed patch gives way slowly and then all at once, like an avalanche (coussot2002): the layers slide again.",
    "spark": "",
    "spark_cell": "none",
    "no_spark": "No spark: nothing in a layer that starts to slide makes one; the pull on its nerve endings eases.",
    "move": "Patches jam and give way on their own; only a shared cause, a change in movement or stress, moves several at once.",
    "time": "What decides it is whether ordinary movement, once the stress has gone, shears a jammed patch past its band.",
    "no_time": "",
    "record": _record,
    "record_cell": "the layers slide again",
    "record_none": "No release of the knot at the spot to record.",
}


def _sample(k: int, seed: int) -> list[dict]:
    """Its own table and the shared interface, one Sobol draw; its own wide ranges log-uniform."""
    own, shared = load("densification"), load("interface")
    tabs = own | shared
    keys = tuple(own) + tuple(shared)
    X = qmc.Sobol(len(keys), seed=seed).random(k)
    out = []
    for i, x in enumerate(X):
        d = {"seed": seed * 1000 + i}
        for q, u in zip(keys, x):
            lo, hi = tabs[q].range
            d[q] = float(np.exp(np.log(lo) + u * np.log(hi / lo))) if q in own and lo > 0 and hi / lo > 4 else lo + u * (hi - lo)
        out.append(d)
    return out


class Runner:
    def __init__(self, k: int = K, seed: int = SEED):
        self.K = k
        self.ps = _sample(k, seed)
        self.se = senses.sample(k, seed)
        self.depth = np.array([s["skin"] + s["fat"] for s in self.se])
        self.lay = patch.layer(float(np.median(self.depth)))
        N = self.lay.n
        self.P = {q: np.repeat(np.array([p[q] for p in self.ps], float), N).reshape(k, N) for q in self.ps[0] if q != "seed"}
        edges = np.array([dm.band(p["steep"], p["x_max"]) for p in self.ps])
        self.uc, self.uj, self.xc, self.xj = edges.T
        self.u_mid = np.sqrt(self.uc * self.uj)
        self.hold = np.array([p["hold"] for p in self.ps])
        g = np.array([p["guard"] for p in self.ps])
        self.U = self.u_mid * np.exp(g * self.hold * patch.Z_REF)  # the shared rule: the hold leaves the typical place mid-band
        self.free = np.array([dm.steady(p["steep"], p["x_max"], float(m))[0] for p, m in zip(self.ps, self.u_mid)])
        z = np.random.default_rng(41).normal(0, 1, N)
        self.mob = np.exp(self.P["spread"] * z[None, :])  # how much each patch moves, by its place
        self.zone = self.lay.zone
        self.under_hand = self.lay.near(patch.SPOT, patch.HAND_R)
        self.rolled = self.lay.in_roll()
        self.roi = self.lay.near(patch.SPOT, patch.ROI_R)
        self.sham = self.lay.near(patch.SHAM, patch.ROI_R)
        self._dS = np.zeros(k)
        self._aim = np.zeros((k, N), bool)
        self._chronic = None
        self._formed = None
        self.vessel_mm, self.vessel_depth = 0.0, float(np.median(self.depth))

    # --- the drive ---
    def _drive(self, s_eff, mv: float, rolling: bool, pressing: np.ndarray, variant: str) -> np.ndarray:
        P, U = self.P, self.U[:, None]
        u = U * self.mob * (np.exp(-P["guard"] * np.maximum(s_eff, 0.0)) + P["breath_move"] * mv)
        if rolling:
            u = u + U * P["roll_shear"] * self.rolled[None, :]
        if variant == "friction":
            u = u + U * P["friction"] * (pressing[:, None] & self.under_hand[None, :])
        return u

    def _rest(self) -> tuple[np.ndarray, np.ndarray]:
        """Its knots before any scene: fully built after a still night, then a day's movement at the holding stress."""
        if self._chronic is None:
            x = np.array([p["x_max"] for p in self.ps])[:, None] * np.ones((self.K, self.lay.n))
            s_eff = self.hold[:, None] * self.zone[None, :]
            u = self._drive(s_eff, 0.0, False, np.zeros(self.K, bool), "rest")
            for _ in range(int(DAY / 5.0)):
                x = dm.step(self.P, x, u, 0.0, 5.0)
            self._chronic = x
        return self._chronic.copy(), np.zeros((self.K, self.lay.n))

    def _integrate(self, scene: Scene, x, T, frames: Frames | None, work=None, variant: str = "rest"):
        P = self.P
        mv_mood = moods(self.ps, scene.duration) if scene.mood else None
        steps = int(round(scene.duration / DT))
        u = np.zeros_like(x)
        for i in range(steps + 1):
            t = i * DT
            pressing = np.full(self.K, scene.hand(t))
            if work is not None:
                hand, target = work
                pressing = hand.step(t, (x > self.xj[:, None])[np.arange(self.K), target])
            s = stress(scene, t, self.hold, mv_mood)
            mv = 0.0
            if scene.breathing(t):
                w = wave(scene, t)
                s = s + P["breath_fall"][:, 0] * (P["breath_in_share"][:, 0] * max(w, 0.0) + min(w, 0.0)) \
                    - calmed(scene, t, P["breath_calm"][:, 0], P["tau_calm"][:, 0])
                mv = moved(scene, t)
            s_eff = s[:, None] * self.zone[None, :]
            if scene.calm_until and t < scene.calm_until:  # the knot's own stress lowered, aimed at it alone
                s_eff = s_eff - self._dS[:, None] * self._aim
            u = self._drive(s_eff, mv, scene.rolling(t), pressing, variant)
            if frames is not None:
                while frames.due(t):
                    frames.take({"x": x.copy(), "u": u.copy(), "T": T.copy(), "s": s.copy(), "hand": pressing.copy()})
            if i == steps:
                break
            T = T + DT * (P["hand_warm"] * (pressing[:, None] & self.under_hand[None, :]) - T) / P["tau_warm"]
            x = dm.step(P, x, u, T, DT)
        return x, T

    def formed(self):
        if self._formed is None:
            from .scenes import BY_ID

            self._formed = self._integrate(BY_ID["forms"], *self._rest(), None)
        x, T = self._formed
        return x.copy(), T.copy()

    def run(self, scene: Scene, variant: str = "rest") -> Run:
        from ..exam import Hand

        x, T = self._rest() if scene.start == "rest" else self.formed()
        held0 = x > self.xj[:, None]
        d = ((self.lay.pos - patch.SPOT) ** 2).sum(axis=1)
        target = np.array([int(np.argmin(np.where(held0[k] & self.under_hand, d, np.inf))) if (held0[k] & self.under_hand).any()
                           else self.lay.focal for k in range(self.K)])
        self._aim = np.zeros((self.K, self.lay.n), bool)
        self._aim[np.arange(self.K), target] = True
        frames = Frames(scene.duration, scene.frame)
        work = (Hand(self.K), target) if scene.work else None
        x, T = self._integrate(scene, x, T, frames, work, variant)
        if scene.start == "rest" and variant == "rest":
            self._formed = (x.copy(), T.copy())
        return self._read(scene, frames, target)

    def _read(self, scene: Scene, frames: Frames, target: np.ndarray) -> Run:
        x, u, T = (frames.stack(q) for q in ("x", "u", "T"))
        t = frames.times[: len(x)]
        n = self.P["steep"][None]
        held = x > self.xj[None, :, None]
        glide = (1 + self.free[None, :, None] ** n) / (1 + x**n)  # sliding, as a share of a free layer's under the same drive
        # movement pulling on a patch that does not slide strains the fascia's nerve endings; it eases as the layer slides
        tender = self.P["tender_k"][None] * u / self.u_mid[None, :, None] * np.clip(1 - glide, 0, 1)
        pick = lambda a: a[:, np.arange(self.K), target]
        roi = lambda mask: glide[:, :, mask].mean(axis=2)
        xm = np.array([p["x_max"] for p in self.ps])
        return Run(theory=ID, scene=scene.id, t=t, held=held, bump=np.zeros_like(x), tender=tender,
                   active=(x > self.xc[None, :, None]) & ~held, events=[],
                   focal={"structure": pick(x) / xm[None, :], "sliding": np.clip(pick(glide), 0, 1.5),
                          "drive": pick(u) / self.uj[None, :], "warmth": pick(T)},
                   inst={"glide_spot": np.clip(roi(self.roi), 0, 1.5), "glide_sham": np.clip(roi(self.sham), 0, 1.5)},
                   stress=frames.stack("s"), hand=frames.stack("hand"), target=target)

    def ageing(self) -> tuple[np.ndarray, np.ndarray]:
        """A jammed patch at the typical place, held half an hour, or three hours, at the holding stress; then the stress
        ends. Is it still jammed an hour later? Per setting; `letgo_after` keeps, for the three hours, how long after the
        stress ends it gives way (s; nan if it stays)."""
        P = {q: np.array([p[q] for p in self.ps], float) for q in self.ps[0] if q != "seed"}
        out = []
        for hours in (0.5, 3.0):
            x = P["x_max"].copy()
            end = hours * 3600.0
            gone = np.full(self.K, np.nan)
            for i in range(int((end + 3600.0) / 2.0)):
                t = i * 2.0
                s = self.hold * patch.Z_REF if t < end else np.zeros(self.K)
                u = self.U * np.exp(-P["guard"] * s)
                x = dm.step(P, x, u, 0.0, 2.0)
                if t >= end:
                    gone[np.isnan(gone) & (x <= self.xj)] = t + 2.0 - end
            out.append(x > self.xj)
            self.letgo_after = gone
        return out[0], out[1]

    def settings(self) -> np.ndarray:
        return np.array([[p[q] for q in SETTING_KEYS] for p in self.ps])
