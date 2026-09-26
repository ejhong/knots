"""The field: broad release takes easy knots everywhere; focused release takes the knots at the spot."""

import numpy as np

from knots_sim import field


def test_broad_and_focused_release_differ_in_where():
    f = field.patch(120, seed=3)
    near = np.exp(-(((f["pos"] - np.array(field.SPOT)) ** 2).sum(axis=1)) / (2 * field.RADIUS**2)) > np.exp(-0.5)
    out = {}
    for name in ("calm", "broad", "focused"):
        r = field.run(f, name, breaths=12)
        freed = r["knot"] & ~np.isnan(r["released_s"])
        out[name] = (r["knot"], freed)
    knot, calm = out["calm"]
    _, broad = out["broad"]
    _, focused = out["focused"]
    assert calm.sum() <= 2  # without a breath, knots hold
    assert broad[~near].sum() > focused[~near].sum() + 3  # broad reaches knots everywhere
    frac = lambda freed, where: freed[where].sum() / max(knot[where].sum(), 1)
    assert frac(focused, near) > frac(focused, ~near) + 0.2  # focused takes the knots at the spot
