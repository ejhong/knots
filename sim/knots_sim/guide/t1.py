"""T1, perforators, in the field guide: a forest of small trees, each vessel the switch of models/vessel.py, sharing
pressure as in models/tree.py.

How the scenes map onto it (the exam's mapping, theories/t1.py, written out for its proponents to check):

- Stress is extra tone command: U per unit of the shared stress, times each vessel's share of it. U by the shared rule:
  the typical vessel, where stress is held most (share Z_REF), sits in the middle of its window (the surge shuts it, the
  holding stress keeps it shut and cannot shut it alone).
- The breath acts through drive and through movement together (the variant "both"): each out-breath eases tone and the
  in-breath raises it again, and minutes of slow breathing calm; each breath moves the tissue at each vessel.
- Attention concentrates the breath's movement at the spot (focus_gain times); drive is not local.
- A hand is palpation pressure on the vessels under it and a change of shape; a roller the same, 1 s in every 3.
- A knot is a vessel shut by its own wall that can hold (its switch is bistable). Nothing in the tissue stiffens: a shut
  vessel is a fraction of a millimetre across. Its territory runs into oxygen debt (tenderness), and when blood returns
  its nerve bursts (the spark), over the patch it feeds.
"""

from __future__ import annotations

import numpy as np

from ..exam import Hand
from ..models import tree as tr
from ..params import load, values
from ..theories import t1 as adapter
from . import patch, senses
from .base import K, SEED, Frames, Run, calmed, moods, moved, releases, stress, typical, wave
from .scenes import Scene

ID, KEY, NAME, GLYPH = "T1", "perforator", "Perforators", "結"
SHUT = tr.SHUT  # a vessel is shut within 1.5 times its shut radius
TREES, V = 16, 5  # sixteen parents, four children each
DT = 0.05


SETTING_KEYS = adapter.VARY + ("hold", "breath_fall", "breath_strain", "focus_gain", "palpation")
TABLES = ("vessel", "interface")


def _record(med: dict, n: int) -> str:
    fb, fa = med["flow_spot"][1], med["flow_spot"][0]
    sb, sa = med["flow_sham"][1], med["flow_sham"][0]
    return (f"Laser speckle over the spot sees the skin's flow rise from {fb:.2f} to {fa:.2f} of resting flow as it lets "
            f"go (the median of {n} releases), while the sham stays at {sb:.2f} to {sa:.2f}. A press flushes every place it "
            f"presses, so the control is a pressed place with no knot.")


WORDS = {
    "stiff": False,
    "bump": "Nothing firm for a finger to find, only tenderness where it presses.",
    "bump_cell": "nothing firm",
    "inside": "The patch a shut vessel starves signals through its own nerve: a held, achy place, felt without touching, and "
              "a tingle as it lets go.",
    "inside_cell": "a held, achy place",
    "tender": "The patch of tissue a shut vessel feeds runs short of blood.",
    "where": "Where a small artery comes up through the deep fascia, under the skin and fat, in trees: a parent with its "
             "children around it.",
    "where_cell": "at the fascia, on its vessels",
    "units": "Small arteries come up one every 4-5 mm",
    "body": "A body has on the order of 100,000 such vessels (estimated from their spacing; 374 major ones, taylor1987).",
    "forms": "A vessel shuts when its tone passes the fold of its switch; a parent that shuts takes its children with it.",
    "rolling": "pressure outside a vessel keeps it shut only while it lasts.",
    "breath": "The out-breath eases tone and the in-breath raises it again, so a knot lets go when the easing outlasts the rise.",
    "attention": "Drive is not local: attention changes only how much the breath moves the tissue at the spot.",
    "micro": "Small breaths move the tissue little and change drive little: what is left is attention concentrating their "
             "movement at the spot.",
    "needs_what": "the sympathetic drive to the knot's own small artery",
    "needs": "Tone eases slowly when drive falls (the gasp reflex's recovery, fitted to one recording), so a calming has to last.",
    "hand": "A vessel pressed shut cannot reopen until the pressure lifts.",
    "letgo": "As it opens, blood floods the starved patch.",
    "spark": "As blood returns the vessel's nerve bursts: a tingle over the patch it feeds.",
    "spark_cell": "a tingle over its patch",
    "no_spark": "",
    "move": "In a tree a parent's knot shuts its children, and its release lets most of them go.",
    "time": "",
    "no_time": "",
    "record": _record,
    "record_cell": "skin flow floods in",
    "record_none": "No release of the knot at the spot to record.",
}

class Runner:
    def __init__(self, k: int = K, seed: int = SEED):
        self.K = k
        self.ps = adapter.sample(k, seed)
        self.se = senses.sample(k, seed)
        self.lay = patch.forest()
        N = self.lay.n
        parent = np.array([kd == "parent" for kd in self.lay.kind])
        rng = np.random.default_rng(7)
        lo, hi = load("vessel")["wall"].range
        self.walls = np.where(parent, rng.uniform(0.5 * (lo + hi), hi, N), rng.uniform(lo, hi, N))
        tv = values("tree")
        built = [tr.build(self.walls.reshape(TREES, V), tv["P_source"], tv["P_bed"], tv["ratio"], base=p) for p in self.ps]
        t0 = built[0]
        self.tree = {"T": k * TREES, "V": V, "K": V - 1, "rigid": False,
                     "Ps": np.concatenate([b["Ps"] for b in built]), "Pv": np.concatenate([b["Pv"] for b in built]),
                     "R": np.concatenate([b["R"] for b in built]),
                     "pars": {q: np.concatenate([b["pars"][q] for b in built]) for q in t0["pars"]},
                     "xc": np.repeat([p["xc"] for p in self.ps], TREES)[:, None]}
        grab = lambda q: np.concatenate([b[q] for b in built]).reshape(k, N)
        self.urest, self.Aopen, self.Afold = grab("urest"), grab("Aopen"), grab("Afold")
        self.bist = (self.Aopen > 0) & (self.Aopen < self.Afold) & (self.Afold < 1)
        self.xrest = self.tree["pars"]["xrest"].reshape(k, N)
        self.xc = np.array([p["xc"] for p in self.ps])[:, None]
        self.zone = self.lay.zone
        P = lambda q: np.array([p[q] for p in self.ps])
        self.hold, self.fall, self.in_share = P("hold"), P("breath_fall"), P("breath_in_share")
        self.calm, self.tau_calm, self.strain = P("breath_calm"), P("tau_calm"), P("breath_strain")
        self.focus, self.palp, self.press_strain = P("focus_gain"), P("palpation"), P("press_strain")
        self.U = self._scale()
        self.under_hand = self.lay.near(patch.SPOT, patch.HAND_R)
        self.rolled = self.lay.in_roll()
        self.roi = self.lay.near(patch.SPOT, patch.ROI_R)
        self.sham = self.lay.near(patch.SHAM, patch.ROI_R)
        self._dS = np.zeros(k)  # a calming aimed at the knot (the envelope), per setting
        self._aim = np.zeros((k, self.lay.n), bool)
        self._formed = None
        self.variant = "both"  # the breath through drive and movement; "aimed": attention aims the drive at the spot

    def _scale(self) -> np.ndarray:
        """U per setting by the shared rule, at the typical vessel that can hold (the median over the forest)."""
        ur, Ao, Af = self.urest, self.Aopen, self.Afold
        h = self.hold[:, None] * patch.Z_REF
        lo = np.maximum(Af - ur, (Ao - ur) / h) / patch.Z_REF
        hi = np.minimum((Af - ur) / h, (1 - ur) / patch.Z_REF)
        can = self.bist & (Af > ur) & (lo < hi)
        out = np.full(self.K, 0.8)
        for k in range(self.K):
            if can[k].any():
                out[k] = float(np.median(np.sqrt(lo[k][can[k]] * hi[k][can[k]])))
        return out

    # ---------- the integrator ----------

    def _rest(self) -> np.ndarray:
        Y = np.zeros((8, self.K * TREES, V))
        Y[0] = self.tree["pars"]["xrest"]
        Y[1] = self.urest.reshape(-1, V)
        return Y

    def _integrate(self, scene: Scene, Y: np.ndarray, frames: Frames | None, hand: Hand | None = None,
                   target: np.ndarray | None = None) -> np.ndarray:
        f = tr._rhs()
        tree = self.tree
        pars = dict(tree["pars"])
        Kk, N = self.K, self.lay.n
        mv_mood = moods(self.ps, scene.duration) if scene.mood else None
        names = tr.v.PARAMS

        def F(Y, u):
            pars["P"], _ = tr.pressures(tree, Y[0])
            d = f(tuple(Y), u, tuple(pars[q] for q in names))
            return np.array([np.broadcast_to(di, Y[0].shape) for di in d], dtype=float)

        steps = int(round(scene.duration / DT))
        for i in range(steps + 1):
            t = i * DT
            x = Y[0].reshape(Kk, N)
            held = (x < SHUT * self.xc) & self.bist
            pressing = np.full(Kk, scene.hand(t))
            if hand is not None:
                pressing = hand.step(t, held[np.arange(Kk), target])
            if frames is not None:
                while frames.due(t):
                    frames.take({"x": x.copy(), "A": Y[1].reshape(Kk, N).copy(), "m": Y[2].reshape(Kk, N).copy(),
                                 "n": Y[3].reshape(Kk, N).copy(), "s": stress(scene, t, self.hold, mv_mood),
                                 "hand": pressing.copy()})
            if i == steps:
                break
            u = self._inputs(scene, t, pressing, mv_mood)
            k1 = F(Y, u)
            k2 = F(Y + DT / 2 * k1, u)
            k3 = F(Y + DT / 2 * k2, u)
            k4 = F(Y + DT * k3, u)
            Y = Y + DT / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
            Y[0] = np.maximum(Y[0], tree["xc"])
            Y[1:] = np.clip(Y[1:], 0.0, 1.0)
        return Y

    def _inputs(self, scene: Scene, t: float, pressing: np.ndarray, mv_mood) -> tuple:
        Kk, N = self.K, self.lay.n
        s = stress(scene, t, self.hold, mv_mood)
        u = self.urest + (self.U * s)[:, None] * self.zone[None, :]
        mv = np.zeros((Kk, N))
        pe = np.zeros((Kk, N))
        if scene.breathing(t):
            w = wave(scene, t)
            du = self.fall * self.U * (self.in_share * max(w, 0.0) + min(w, 0.0)) - calmed(scene, t, self.calm, self.tau_calm) * self.U
            aim = np.where(scene.attending(t) & self.under_hand[None, :], self.focus[:, None], 1.0) if self.variant == "aimed" \
                else np.ones((Kk, N))
            u = u + du[:, None] * aim
            if self.variant != "aimed":  # through movement too; attention concentrates it at the spot
                mv = mv + (self.strain * moved(scene, t))[:, None]
                if scene.attending(t):
                    mv = np.where(self.under_hand[None, :], mv * self.focus[:, None], mv)
        if scene.calm_until and t < scene.calm_until:  # the knot's own drive lowered, aimed at it alone
            u = u - (self.U * self._dS)[:, None] * self.zone[None, :] * self._aim
        press = np.zeros((Kk, N), bool)
        press |= pressing[:, None] & self.under_hand[None, :]
        if scene.rolling(t):
            press |= self.rolled[None, :]
        pe = np.where(press, self.palp[:, None], pe)
        mv = np.where(press, np.maximum(mv, self.press_strain[:, None]), mv)
        sh = (-1, V)
        return np.clip(u, 0, 1).reshape(sh), pe.reshape(sh), np.clip(mv, 0, 1).reshape(sh)

    # ---------- the scenes ----------

    def formed(self) -> np.ndarray:
        """The state a surge leaves, held at the holding stress (the start of every "formed" scene)."""
        if self._formed is None:
            from .scenes import BY_ID

            self._formed = self._integrate(BY_ID["forms"], self._rest(), None)
        return self._formed.copy()

    def run(self, scene: Scene, variant: str = "both") -> Run:
        self.variant = variant
        Kk, N = self.K, self.lay.n
        Y0 = self._rest() if scene.start == "rest" else self.formed()
        x0 = Y0[0].reshape(Kk, N)
        held0 = (x0 < SHUT * self.xc) & self.bist
        target = self._target(held0)
        self._aim = np.zeros_like(held0)
        self._aim[np.arange(Kk), target] = True
        frames = Frames(scene.duration, scene.frame)
        hand = Hand(Kk) if scene.work else None
        Y = self._integrate(scene, Y0, frames, hand, target)
        if scene.start == "rest" and variant == "both":
            self._formed = Y.copy()
        self.variant = "both"
        return self._read(scene, frames, target)

    def _target(self, held0: np.ndarray) -> np.ndarray:
        """Per setting, the knot a scene works on: the held vessel nearest the spot under the hand, else the nearest."""
        d = ((self.lay.pos - patch.SPOT) ** 2).sum(axis=1)
        out = np.full(self.K, self.lay.focal)
        for k in range(self.K):
            ok = held0[k] & self.under_hand
            if ok.any():
                out[k] = int(np.argmin(np.where(ok, d, np.inf)))
        return out

    def _read(self, scene: Scene, frames: Frames, target: np.ndarray) -> Run:
        x, A, m, n = (frames.stack(q) for q in ("x", "A", "m", "n"))
        t = frames.times[: len(x)]
        held = (x < SHUT * self.xc[None]) & self.bist[None]
        shut = x < SHUT * self.xc[None]
        tender_at = np.array([s["tender_debt"] for s in self.se])
        tender = m / tender_at[None, :, None]
        q = np.minimum((x / self.xrest[None]) ** 4, 4.0)
        events = []
        spark_at = np.array([s["spark"] for s in self.se])
        for k, j, tr_ in releases(t, held):
            win = (t >= tr_) & (t <= tr_ + 10.0)
            size = float(n[win, k, j].max()) if win.any() else 0.0
            if size >= spark_at[k]:
                events.append({"k": k, "unit": j, "t": tr_, "kind": "spark", "size": size})
        roi = lambda mask: q[:, :, mask].mean(axis=2)
        foc = target
        pick = lambda a: a[:, np.arange(self.K), foc]
        # what a hand could feel: the shut vessel itself, a fraction of a millimetre across, at the deep fascia
        radius = np.array([p["r100"] for p in self.ps]) * 1e3  # mm
        a = radius[:, None] * np.where(np.array([kd == "parent" for kd in self.lay.kind]), 2.0, 1.0)[None, :]
        depth = np.array([s["skin"] + s["fat"] for s in self.se])
        k_v = np.array([s["k_vessel"] for s in self.se])
        touch = np.array([s["touch"] for s in self.se])
        bump = senses.felt(k_v[None, :, None] * held, a[None], a[None], depth[None, :, None], touch[None, :, None])
        return Run(theory=ID, scene=scene.id, t=t, held=held, bump=bump, tender=tender,
                   active=shut & ~held, events=events,
                   focal={"lumen": pick(x / self.xrest[None]), "tone": pick(A), "debt": pick(m), "nerve": pick(n)},
                   inst={"flow_spot": roi(self.roi), "flow_sham": roi(self.sham)},
                   stress=frames.stack("s"), hand=frames.stack("hand"), target=target)

    def settings(self) -> np.ndarray:
        """The sampled numbers per setting, for choosing a typical one."""
        keys = adapter.VARY + ("hold", "breath_fall", "breath_strain", "focus_gain", "palpation")
        return np.array([[p[q] for q in keys] for p in self.ps])
