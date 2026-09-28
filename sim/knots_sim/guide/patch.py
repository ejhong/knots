"""The shared patch (sim/PLAN.md §3): the same piece of body for every theory, each placing its own units in it.

A patch 4 cm square of the upper back over the trapezius, seen from above: x along the muscle's fibres, y across them,
toward the neck. Stress is held more toward the neck and in one place near the spot. A hand rests, and attention goes,
at the spot; a sham place for instruments lies away from it; a roller passes over a quiet corner. Every theory's units
sit where its own anatomy puts them, so how many knots a patch can hold, and where, is itself a result.

Coordinates in mm. Representative: the layouts are drawn from each theory's anatomy, not measured in one person.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

SIZE = 40.0  # mm
SPOT = np.array([27.0, 28.0])  # where a hand rests and attention goes
HAND_R = 8.0  # mm: what a resting hand (a thumb or two fingertips) covers: guessed
SHAM = np.array([9.0, 9.0])  # a place for instruments, away from the spot and where stress is least held
ROI_R = 5.0  # mm: the region an instrument reads, at the spot and at the sham
ROLL = (np.array([2.0, 3.0]), np.array([20.0, 15.0]))  # the quiet corner a roller passes over: (lower-left, upper-right)
Z_REF = 1.0  # the share of stress at the typical place where it is held most: every theory's scale is set there


def share(pos: np.ndarray) -> np.ndarray:
    """How much of the held stress reaches each place (0.3 to 1.1): more toward the neck (y), and in one place beside
    the spot, where stress is held. The same field for every theory."""
    x, y = pos[:, 0] / SIZE, pos[:, 1] / SIZE
    s = 0.32 + 0.55 * np.exp(-(((y - 0.95) / 0.32) ** 2)) + 0.45 * np.exp(-((x - 0.67) ** 2 + (y - 0.7) ** 2) / 0.022)
    return np.clip(s, 0.0, 1.1)


@dataclass
class Layout:
    """A theory's units in the patch. `a_along`, `a_across`: the half-sizes of what stiffens when a unit holds (mm,
    along and across the fibres; 0 if nothing does); `depth`: how deep it lies (mm); `kind`: what each unit is;
    `parent`: for trees, each unit's parent (-1 for none)."""

    pos: np.ndarray
    kind: list[str]
    a_along: np.ndarray
    a_across: np.ndarray
    depth: np.ndarray
    parent: np.ndarray
    note: str
    extra: dict = field(default_factory=dict)

    @property
    def n(self) -> int:
        return len(self.pos)

    @property
    def zone(self) -> np.ndarray:
        return share(self.pos)

    def near(self, centre: np.ndarray, r: float) -> np.ndarray:
        return ((self.pos - centre) ** 2).sum(axis=1) < r * r

    @property
    def focal(self) -> int:
        """The unit at the spot: the one nearest it."""
        return int(np.argmin(((self.pos - SPOT) ** 2).sum(axis=1)))

    def in_roll(self) -> np.ndarray:
        lo, hi = ROLL
        return np.all((self.pos >= lo) & (self.pos <= hi), axis=1)


def _clip(p: np.ndarray) -> np.ndarray:
    return np.clip(p, 1.0, SIZE - 1.0)


def forest(seed: int = 3) -> Layout:
    """T1: a forest of small trees. A parent perforator every 10 mm (a jittered grid), each feeding four children about
    4.5 mm away, so that small vessels come up one every 4-5 mm (the site's estimate for the skin's small perforators)."""
    rng = np.random.default_rng(seed)
    g = (np.stack(np.meshgrid(np.arange(4), np.arange(4)), -1).reshape(-1, 2) + 0.5) * 10.0
    parents = _clip(g + rng.normal(0, 1.2, g.shape))
    pos, kind, parent = [], [], []
    for i, p in enumerate(parents):
        pos.append(p)
        kind.append("parent")
        parent.append(-1)
        theta = rng.uniform(0, np.pi / 2) + np.arange(4) * np.pi / 2
        for th in theta:
            r = rng.uniform(4.0, 5.0)
            pos.append(_clip(p + r * np.array([np.cos(th), np.sin(th)])))
            kind.append("child")
            parent.append(5 * i)
    n = len(pos)
    return Layout(pos=np.array(pos), kind=kind, a_along=np.zeros(n), a_across=np.zeros(n), depth=np.zeros(n),
                  parent=np.array(parent), note="a parent every 10 mm feeding four children: a small vessel every 4-5 mm")


def band(depth: float, seed: int = 4) -> Layout:
    """T3: contraction knots along the zone where the muscle's nerve enters it, which crosses the fibres mid-belly: five
    candidate places 8 mm apart. Each holds as a nodule (a nidus of contracted sarcomeres, sikdar2009) on a taut band
    running along the fibres."""
    rng = np.random.default_rng(seed)
    ys = np.array([4.0, 12.0, 20.0, 28.0, 36.0]) + rng.normal(0, 0.8, 5)
    xs = 24.0 + rng.normal(0, 1.2, 5)
    n = 5
    return Layout(pos=_clip(np.stack([xs, ys], -1)), kind=["nodule"] * n, a_along=np.full(n, 4.0),
                  a_across=np.full(n, 2.5), depth=np.full(n, depth), parent=np.full(n, -1),
                  note="a few candidate places along the zone where the muscle's nerve enters it",
                  extra={"zone_x": 24.0})


def places(spacing: float = 10.0) -> Layout:
    """T6: places on the body map, at the resolution with which a place on the back is told from its neighbours. Nothing
    in the tissue stiffens."""
    k = int(round(SIZE / spacing))
    g = (np.stack(np.meshgrid(np.arange(k), np.arange(k)), -1).reshape(-1, 2) + 0.5) * spacing
    n = len(g)
    return Layout(pos=g, kind=["place"] * n, a_along=np.zeros(n), a_across=np.zeros(n), depth=np.zeros(n),
                  parent=np.full(n, -1), note=f"places on the body map, about {spacing:.0f} mm apart",
                  extra={"spacing": spacing})


def territories(depth: float, seed: int = 6) -> Layout:
    """T7: motor units whose territories lie under the patch. Their fibres are scattered through a territory 5-10 mm
    across and run along the muscle, so what stiffens when one fires is a long, thin band along the fibres. 64
    representative units (the ones at low thresholds that stress could hold)."""
    rng = np.random.default_rng(seed)
    g = (np.stack(np.meshgrid(np.arange(8), np.arange(8)), -1).reshape(-1, 2) + 0.5) * 5.0
    pos = _clip(g + rng.normal(0, 1.0, g.shape))
    n = len(pos)
    return Layout(pos=pos, kind=["unit"] * n, a_along=rng.uniform(10.0, 20.0, n), a_across=rng.uniform(2.5, 5.0, n),
                  depth=np.full(n, depth), parent=np.full(n, -1),
                  note="motor units' territories, 5-10 mm across, running along the fibres")
