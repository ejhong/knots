"""T3, trigger points, in the field guide: the energy crisis at an endplate (models/triggerpoint.py), at a few places
along the zone where the muscle's nerve enters it.

How the scenes map onto it (the exam's mapping, theories/t3.py, written out for its proponents to check):

- Stress raises endplate drive, times each place's share of it; each place's baseline drive is the setting's typical
  one (the middle of the window the shared rule finds by running the surge, `theories.t3.windows`) with its own spread.
- The breath lowers stress (relaxation lowering motor drive) and its movement stretches the band (the variant
  "drive+stretch"); attention concentrates that stretch at the spot (focus_gain times).
- A hand is sustained pressure on the places under it: it squeezes their capillaries and, held, lengthens the
  contracture (at the rate that lets a knot of middle depth go in the 60-90 s of pressure release, pecosmartin2019); a
  roller the same, 1 s in every 3.
- A knot is a contracture that holds (c > 0.5): a stiff nodule in a taut band, felt through skin and fat as senses.py
  says; its acid milieu is its tenderness; a release fast enough twitches.
"""

from __future__ import annotations

import numpy as np

from ..models import triggerpoint as tp
from ..theories import t3 as adapter
from . import patch, senses
from .base import K, SEED, Frames, Run, calmed, moods, moved, releases, stress, wave
from .scenes import Scene

ID, KEY, NAME, GLYPH = "T3", "trigger-point", "Trigger points", "点"
DT = 0.05
TWITCH = 0.05  # a twitch felt, on the account's 0-1 scale (the exam's SPARK)


SETTING_KEYS = ("stress_gain", "squeeze", "relax", "use", "tau_energy", "milieu_gain", "tau_milieu", "hold", "palpation",
                "breath_fall", "breath_strain")
TABLES = ("triggerpoint", "interface")


def _record(med: dict, n: int) -> str:
    sb, sa = med["stiffness"][1], med["stiffness"][0]
    eb, ea = med["needle_emg"][1], med["needle_emg"][0]
    return (f"Elastography through the pressing probe sees the nodule's contracture fall from {sb:.2f} to {sa:.2f} over "
            f"the tens of seconds around its release (the median of {n}), under the hand; a needle in it finds the endplate "
            f"still active ({eb:.1f} times its typical level before, {ea:.1f} after): the press lengthens the band, it does "
            f"not quiet the endplate. Nothing changes in the skin.")


WORDS = {
    "stiff": True,
    "bump": "A small firm nodule on a taut band, about the size measured by ultrasound (0.16 cm², sikdar2009).",
    "bump_cell": "a small nodule on a band",
    "stiffness": "A contracture resists a stretch: the taut band itself.",
    "stiff_cell": "a taut band",
    "rolled": "Each pass is a brief press, not the sustained pressure that lengthens the contracture.",
    "no_warmth": "The model gives heat no route: the account's releases are pressure, stretch and needling.",
    "inside": "Its acid, sensitising milieu stirs the muscle's nerves: an ache felt from inside.",
    "inside_cell": "an ache",
    "layer": "in the muscle",
    "tender": "Its contraction squeezes its own capillaries, and the acid, sensitising milieu is its tenderness.",
    "where": "In the muscle, along the zone where its nerve enters it: a few candidate places, not everywhere.",
    "where_cell": "in muscle, where its nerve enters",
    "units": "Candidate places along the innervation zone, a few in each muscle",
    "body": "A body has a few hundred such places (300 taken as representative).",
    "forms": "Stress raises endplate activity; the contraction squeezes its capillaries, and the starved sarcomeres cannot "
             "let go: an energy crisis.",
    "rolling": "a brief press adds a little ischaemia, not enough to start a crisis where none is near.",
    "breath": "Relaxation lowers endplate activity, and the breath's movement stretches the band.",
    "attention": "Attention concentrates the breath's stretch at the spot.",
    "micro": "Small breaths stretch the band little; the calm they bring lowers endplate activity a little.",
    "needs_what": "endplate activity at the knot",
    "needs": "The energy crisis holds by its own squeezed capillaries: it needs pressure or stretch, not calm alone.",
    "family": "Nothing in this account links trigger points in trees: its key point and satellites are not modelled yet.",
    "hand": "Sustained pressure lengthens the contracture slowly, over the tens of seconds of pressure release.",
    "letgo": "The contracture relaxes as energy returns.",
    "spark": "A release fast enough twitches: the local twitch response.",
    "spark_cell": "a twitch",
    "no_spark": "",
    "move": "Nothing here links one trigger point to another: the key point and its satellites are not in the patch yet.",
    "time": "",
    "no_time": "Its slow sustaining factors, over weeks, are not modelled yet.",
    "record": _record,
    "record_cell": "stiffness falls in the muscle",
    "record_none": "No release of the knot at the spot to record.",
}

class Runner:
    def __init__(self, k: int = K, seed: int = SEED):
        self.K = k
        self.ps = adapter.sample(k, seed)
        self.se = senses.sample(k, seed)
        depth = np.array([s["skin"] + s["fat"] + s["into_muscle"] for s in self.se])
        self.lay = patch.band(float(np.median(depth)))
        self.depth = depth
        N = self.lay.n
        self.P = {q: np.repeat(np.array([p[q] for p in self.ps], float), N).reshape(k, N) for q in self.ps[0] if q != "seed"}
        mids = np.array([0.0 if w is None else float(np.sqrt(w[0] * w[1])) for w in adapter.windows(self.ps)])
        z = np.random.default_rng(13).normal(0, 1, N)
        self.a0 = mids[:, None] * np.exp(self.P["drive_sd"] * z[None, :])
        self.mid = mids
        self.zone = self.lay.zone
        self.under_hand = self.lay.near(patch.SPOT, patch.HAND_R)
        self.rolled = self.lay.in_roll()
        # what a nodule is, felt: an ellipse of the measured area, half again as long along the fibres as across
        area = np.array([s["nodule_area"] for s in self.se]) * 100.0  # cm² to mm²
        self.a_along = np.sqrt(area * 1.5 / np.pi)
        self.a_across = self.a_along / 1.5
        self._dS = np.zeros(k)  # a calming aimed at the knot (the envelope), per setting
        self._aim = np.zeros((k, self.lay.n), bool)
        self._formed = None
        self.variant = "drive+stretch"  # "aimed": attention aims the relaxation at the spot

    def _rest(self):
        n = (self.K, self.lay.n)
        return tp.State(c=np.zeros(n), e=np.ones(n), m=np.zeros(n), l=np.zeros(n))

    def _integrate(self, scene: Scene, st, frames: Frames | None, work=None):
        P = self.P
        mv_mood = moods(self.ps, scene.duration) if scene.mood else None
        hold = P["hold"][:, 0]
        rolled = self.under_hand if scene.roll_at == "spot" else self.rolled
        last = None
        steps = int(round(scene.duration / DT))
        fall_max = np.zeros_like(st.c)
        for i in range(steps + 1):
            t = i * DT
            pressing = np.full(self.K, scene.hand(t))
            if work is not None:
                hand, target = work
                pressing = hand.step(t, st.c[np.arange(self.K), target] > tp.HELD)
            if frames is not None:
                while frames.due(t):
                    frames.take({"c": st.c.copy(), "e": st.e.copy(), "m": st.m.copy(), "l": st.l.copy(),
                                 "fall": fall_max.copy(), "s": stress(scene, t, hold, mv_mood), "hand": pressing.copy(),
                                 "press": press_now.copy() if i else np.zeros_like(st.c)})
                    fall_max[:] = 0.0
            if i == steps:
                break
            s = stress(scene, t, hold, mv_mood)[:, None]
            strain = np.zeros_like(st.c)
            if scene.breathing(t):
                w = wave(scene, t)
                ds = P["breath_fall"][:, :1] * (P["breath_in_share"][:, :1] * max(w, 0.0) + min(w, 0.0)) \
                    - calmed(scene, t, P["breath_calm"][:, 0], P["tau_calm"][:, 0])[:, None]
                if self.variant == "aimed":  # attention aims the relaxation at the spot; no stretch
                    s = s + np.where(scene.attending(t) & self.under_hand[None, :], ds * P["focus_gain"], ds)
                else:  # relaxation, and the breath's movement stretching the band
                    s = s + ds
                    strain = P["breath_strain"] * moved(scene, t)
                    if scene.attending(t):
                        strain = np.where(self.under_hand[None, :], strain * P["focus_gain"], strain)
            if scene.calm_until and t < scene.calm_until:  # the knot's own drive lowered, aimed at it alone
                s = s - self._dS[:, None] * self._aim
            press_now = np.where((pressing[:, None] & self.under_hand[None, :]) |
                                 (scene.rolling(t) & rolled[None, :]), P["palpation"], 0.0)
            rate = np.zeros_like(st.c) if last is None else np.abs(strain - last) / DT
            last = strain
            q = (1 - P["squeeze"] * st.c) * np.maximum(1 - press_now / P["occlude"], 0.0)
            drive = self.a0 * np.maximum(1 + P["stress_gain"] * s * self.zone[None, :], 0.0) * (1 + P["milieu_gain"] * st.m)
            dc = (drive * (1 - st.c) - P["relax"] * st.e ** P["coop"] * st.c - P["stretch_gain"] * rate * st.c
                  - P["press_rate"] * st.l * st.c)
            fall_max = np.maximum(fall_max, -dc)
            st.c = np.clip(st.c + DT * dc, 0.0, 1.0)
            st.l = np.clip(st.l + DT * ((press_now / 40.0) * (1 - st.l) - (press_now <= 0) * st.l) / P["tau_press"], 0.0, 1.0)
            st.e = np.clip(st.e + DT * (q * (1 - st.e) - P["use"] * st.c * st.e) / P["tau_energy"], 0.0, 1.0)
            st.m = np.clip(st.m + DT * ((1 - q) - st.m) / P["tau_milieu"], 0.0, 1.0)
        return st

    def formed(self):
        if self._formed is None:
            from .scenes import BY_ID

            self._formed = self._integrate(BY_ID["forms"], self._rest(), None)
        f = self._formed
        return tp.State(c=f.c.copy(), e=f.e.copy(), m=f.m.copy(), l=f.l.copy())

    def run(self, scene: Scene, variant: str = "drive+stretch") -> Run:
        from ..exam import Hand

        self.variant = variant
        st = self._rest() if scene.start == "rest" else self.formed()
        held0 = st.c > tp.HELD
        d = ((self.lay.pos - patch.SPOT) ** 2).sum(axis=1)
        target = np.array([int(np.argmin(np.where(held0[k] & self.under_hand, d, np.inf))) if (held0[k] & self.under_hand).any()
                           else self.lay.focal for k in range(self.K)])
        self._aim = np.zeros((self.K, self.lay.n), bool)
        self._aim[np.arange(self.K), target] = True
        frames = Frames(scene.duration, scene.frame)
        work = (Hand(self.K), target) if scene.work else None
        st = self._integrate(scene, st, frames, work)
        if scene.start == "rest" and variant == "drive+stretch":
            self._formed = tp.State(c=st.c.copy(), e=st.e.copy(), m=st.m.copy(), l=st.l.copy())
        self.variant = "drive+stretch"
        return self._read(scene, frames, target)

    def _read(self, scene: Scene, frames: Frames, target: np.ndarray) -> Run:
        c, e, m, l, fall = (frames.stack(q) for q in ("c", "e", "m", "l", "fall"))
        t = frames.times[: len(c)]
        k_n = np.array([s["k_nodule"] for s in self.se])
        touch = np.array([s["touch"] for s in self.se])
        bump = senses.felt(k_n[None, :, None] * c, self.a_along[None, :, None], self.a_across[None, :, None],
                           self.depth[None, :, None], touch[None, :, None])
        tender = m / np.array([s["tender_milieu"] for s in self.se])[None, :, None]
        held = c > tp.HELD
        events = []
        tw = self.P["twitch"]
        for k, j, tr_ in releases(t, held):
            win = (t >= tr_ - 1.0) & (t <= tr_ + 2.0)
            size = min(float(fall[win, k, j].max()) * tw[k, j], 1.0)
            if size >= TWITCH:
                events.append({"k": k, "unit": j, "t": tr_, "kind": "twitch", "size": size})
        pick = lambda a: a[:, np.arange(self.K), target]
        s = frames.stack("s")
        drive = self.a0[None] * np.maximum(1 + self.P["stress_gain"][None] * s[:, :, None] * self.zone[None, None, :], 0) \
            * (1 + self.P["milieu_gain"][None] * m)
        q = (1 - self.P["squeeze"][None] * c) * np.maximum(1 - frames.stack("press") / self.P["occlude"][None], 0.0)
        return Run(theory=ID, scene=scene.id, t=t, held=held, bump=bump, tender=tender, active=(c > 0.2) & ~held,
                   events=events,
                   focal={"contracture": pick(c), "energy": pick(e), "milieu": pick(m), "lengthened": pick(l),
                          "capillary_flow": pick(q)},
                   inst={"needle_emg": pick(drive) / np.maximum(self.mid, 1e-9)[None, :], "stiffness": pick(c),
                         "muscle_flow": pick(q)},
                   stress=s, hand=frames.stack("hand"), target=target, stiff=c)

    def settings(self) -> np.ndarray:
        keys = ("stress_gain", "squeeze", "relax", "use", "tau_energy", "milieu_gain", "tau_milieu", "hold", "palpation",
                "breath_fall", "breath_strain")
        return np.array([[p[q] for q in keys] for p in self.ps])
