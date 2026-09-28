"""What every runner returns, and the pieces they share: the frames, the stress a scene applies, the slow breath."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from ..exam import breath_wave, calm, mood
from .scenes import Scene

SEED = 17  # the exam's: each theory's settings are its own Sobol draw at this seed
K = 32  # settings per theory


@dataclass
class Run:
    """One theory through one scene, in K settings. Arrays are (frames, settings, units) unless said."""

    theory: str
    scene: str
    t: np.ndarray  # (F,) s from the scene's start
    held: np.ndarray  # knots: held units
    bump: np.ndarray  # how firmly each unit is felt at the surface (1 = the edge of touch)
    tender: np.ndarray  # how tender each unit's place is (1 = tender)
    active: np.ndarray  # contracting or shut for now, but not held (tension, a press): for drawing only
    events: list = field(default_factory=list)  # {k, unit, t, kind ('spark' | 'twitch'), size}
    focal: dict = field(default_factory=dict)  # the knot at the spot's own states, (F, K) each
    inst: dict = field(default_factory=dict)  # what instruments read at the spot and the sham, (F, K) each
    stress: np.ndarray | None = None  # (F, K) the shared stress
    hand: np.ndarray | None = None  # (F, K) a hand resting on the spot
    target: np.ndarray | None = None  # (K,) the unit a scene works on (the knot at the spot)


class Frames:
    """Collects a snapshot at every frame time as an integrator passes it."""

    def __init__(self, duration: float, step: float):
        self.times = np.arange(0.0, duration + 1e-9, step)
        self.i = 0
        self.snaps: list[dict] = []

    def due(self, t: float) -> bool:
        return self.i < len(self.times) and t >= self.times[self.i] - 1e-9

    def take(self, snap: dict) -> None:
        self.snaps.append(snap)
        self.i += 1

    def stack(self, key: str) -> np.ndarray:
        return np.array([s[key] for s in self.snaps])


def moods(ps: list[dict], duration: float) -> np.ndarray:
    """Mood's swings of stress for each setting, one value a second (the exam's process, the same path for every
    theory given the setting's seed): (K, seconds)."""
    return np.array([mood(p["mood_sd"], p["mood_tau"], p["seed"])[1][: int(duration) + 2] for p in ps])


def stress(scene: Scene, t: float, hold: np.ndarray, mv: np.ndarray | None) -> np.ndarray:
    """The shared stress at time t, per setting."""
    level = scene.level(t)
    if level == "rest":
        return np.zeros_like(hold)
    if level == "surge":
        return np.ones_like(hold)
    s = hold.copy()
    if scene.mood and mv is not None:
        s = s + mv[:, min(int(t), mv.shape[1] - 1)]
    return s


def wave(scene: Scene, t: float) -> float:
    """The breath's wave (+1 at the top of the in-breath, -1 at the end of the out-breath), or 0 when not breathing."""
    return float(breath_wave(np.array([t]))[0]) if scene.breathing(t) else 0.0


def calmed(scene: Scene, t: float, size: np.ndarray, tau: np.ndarray) -> np.ndarray:
    """How far minutes of slow breathing have lowered stress, per setting (0 when not breathing)."""
    if not scene.breath_until:
        return np.zeros_like(size)
    return calm(min(t, scene.breath_until), size, tau)


def typical(X: np.ndarray, ok: np.ndarray) -> int:
    """The setting nearest the middle of the sampled ranges (by rank), among those marked ok."""
    ranks = np.argsort(np.argsort(X, axis=0), axis=0) / max(len(X) - 1, 1)
    dist = ((ranks - 0.5) ** 2).sum(axis=1)
    dist[~ok] = np.inf
    return int(np.argmin(dist))


GONE = 2.0  # a knot held again sooner than this never let go: a flicker across its threshold, not a release


def releases(t: np.ndarray, held: np.ndarray, start: float = 0.0) -> list[tuple[int, int, float]]:
    """Every release in a run after `start`: (setting, unit, time), counting only knots that stay let go for GONE s (or
    to the end of the run)."""
    out = []
    F, Kk, N = held.shape
    edges = held[:-1] & ~held[1:]
    for i, k, j in zip(*np.nonzero(edges)):
        tr = t[i + 1]
        if tr < start:
            continue
        after = (t >= tr) & (t < tr + GONE)
        if not held[after, k, j].any():
            out.append((int(k), int(j), float(tr)))
    return sorted(out, key=lambda r: (r[0], r[2]))


def formations(t: np.ndarray, held: np.ndarray) -> list[tuple[int, int, float]]:
    """Every knot that forms (setting, unit, time), held for at least GONE s."""
    out = []
    edges = ~held[:-1] & held[1:]
    for i, k, j in zip(*np.nonzero(edges)):
        tf = t[i + 1]
        after = (t >= tf) & (t < tf + GONE)
        if held[after, k, j].all():
            out.append((int(k), int(j), float(tf)))
    return sorted(out, key=lambda r: (r[0], r[2]))
