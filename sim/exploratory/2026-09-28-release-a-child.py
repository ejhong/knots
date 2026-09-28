"""What happens to the parent and the siblings when a child lets go? (exploratory; the author's question, 28 Sep 2026)

The tree of models/tree.py (a parent feeding four children, each a vessel switch, sharing pressure). Kept as run.

A. A cluster: a local surge shuts the parent, and its children shut beneath it. Then one child's own drive falls to rest
   (a release aimed at it) for a minute. Can it open while its parent holds? What do the others do?
B. The queue: the same cluster; the parent is pressed and lifted and lets go; most children open with it, the hardest
   stays. Then that child's drive falls to rest. What do the parent and the open siblings do?
Across plausible trees: pressures, the parent's resistance, the children's walls and the drive sampled (as
tree.robustness does), the worked tree first.

    uv run python exploratory/2026-09-28-release-a-child.py
"""

import numpy as np

from knots_sim.models import tree as tr
from knots_sim.params import load, values

SURGE, PRESS, CHILD = (10.0, 30.0), (100.0, 140.0), 220.0  # the child's release starts at CHILD, for a minute


def trees(n=128, seed=11):
    rng = np.random.default_rng(seed)
    tv = load("tree")
    lo, hi = lambda k: tv[k].range[0], lambda k: tv[k].range[1]
    Ps = np.r_[values("tree")["P_source"], rng.uniform(lo("P_source"), hi("P_source"), n)]
    Pv = np.r_[values("tree")["P_bed"], rng.uniform(lo("P_bed"), hi("P_bed"), n)]
    ratio = np.r_[values("tree")["ratio"], np.exp(rng.uniform(np.log(lo("ratio")), np.log(hi("ratio")), n))]
    wall_range = load("vessel")["wall"].range
    walls = np.vstack([tr.WORKED_WALLS, np.column_stack([np.full(n, 0.30), np.sort(rng.uniform(*wall_range, (n, 4)), axis=1)])])
    u_m = np.r_[tr.WORKED_DRIVE, rng.uniform(0.25, 0.65, n)]
    return tr.build(walls, Ps, Pv, ratio), u_m


def run(tree, u_m, press_parent: bool, child: np.ndarray, release: bool = True):
    T, V = tree["T"], tree["V"]
    urest, P = tree["urest"], tree["pars"]["P"]
    um = u_m[:, None] * np.ones((1, V))

    def inputs(t):
        u = urest.copy() if t < SURGE[0] else um.copy()
        pe, mv = np.zeros((T, V)), np.zeros((T, V))
        if SURGE[0] <= t < SURGE[1]:
            u[:, 0] = 0.95
        if press_parent and PRESS[0] <= t < PRESS[1]:
            pe[:, 0], mv[:, 0] = P[:, 0] + 10, 1.0
        if release and CHILD <= t < CHILD + 60.0:  # the chosen child's own drive falls to rest
            u[np.arange(T), child] = urest[np.arange(T), child]
        return u, pe, mv

    return tr.run(tree, inputs, CHILD + 120.0, dt=0.02, every=10)


tree, u_m = trees()
T = tree["T"]
at = lambda r, time: tr.shut(tree, r["x"])[np.searchsorted(r["t"], time) - 1]
for case, press in (("A. the parent still holds", False), ("B. the parent has let go", True)):
    # the child to release: in A the thickest-walled child (any held child); in B the one still held after the parent went
    probe = run(tree, u_m, press, np.full(T, 1))
    before = at(probe, CHILD - 1.0)
    held_kids = before[:, 1:]
    child = np.where(held_kids.any(axis=1), 1 + np.argmax(held_kids * np.arange(1, 5), axis=1), -1)
    ok = (child > 0) & (before[:, 0] if not press else ~before[:, 0])
    r = run(tree, u_m, press, np.maximum(child, 1))
    b, a1, a2 = at(r, CHILD - 1.0), at(r, CHILD + 55.0), at(r, CHILD + 115.0)
    Pn0, Pn1 = r["Pn"][np.searchsorted(r["t"], CHILD - 1.0)], r["Pn"][np.searchsorted(r["t"], CHILD + 55.0)]
    idx = np.flatnonzero(ok)
    opened = ~a1[idx, child[idx]]
    stays_open = ~a2[idx, child[idx]]
    sib = lambda s, i: np.delete(s[i], [0, child[i]])
    sib_shut = np.array([(sib(a1, i) & ~sib(b, i)).any() for i in idx])  # a sibling newly shut
    sib_open = np.array([(~sib(a1, i) & sib(b, i)).any() for i in idx])  # a held sibling freed
    par_shut = np.array([a1[i, 0] and not b[i, 0] for i in idx])
    par_open = np.array([(not a1[i, 0]) and b[i, 0] for i in idx])
    w = idx[0] == 0
    print(f"\n{case}: {len(idx)} of {T} trees had a held child to release" + (" (the worked tree among them)" if w else ""))
    print(f"  the child opens while its own drive is at rest: {opened.mean():.0%}; stays open a minute after: {stays_open.mean():.0%}")
    print(f"  the parent: newly shut {par_shut.mean():.0%}, freed {par_open.mean():.0%}")
    print(f"  siblings: one newly shut {sib_shut.mean():.0%}, a held one freed {sib_open.mean():.0%}")
    print(f"  pressure the children share: {np.median(Pn0[idx]):.0f} -> {np.median(Pn1[idx]):.0f} mmHg (median)")

# The control for B: the same trees and the same parent release, with no child released. Does the parent shut again
# on its own in the same minute, or a sibling?
probe = run(tree, u_m, True, np.full(T, 1))
before = at(probe, CHILD - 1.0)
held_kids = before[:, 1:]
child = np.where(held_kids.any(axis=1), 1 + np.argmax(held_kids * np.arange(1, 5), axis=1), -1)
idx = np.flatnonzero((child > 0) & ~before[:, 0])
ctrl = run(tree, u_m, True, np.maximum(child, 1), release=False)
b, a1 = at(ctrl, CHILD - 1.0), at(ctrl, CHILD + 55.0)
print(f"\ncontrol for B (no child released), the same {len(idx)} trees: the parent newly shut "
      f"{np.mean([a1[i, 0] and not b[i, 0] for i in idx]):.0%}; a sibling newly shut "
      f"{np.mean([(np.delete(a1[i], [0, child[i]]) & ~np.delete(b[i], [0, child[i]])).any() for i in idx]):.0%}")
