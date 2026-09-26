"""The field: broad release takes easy knots everywhere; focused release takes the knots around the spot."""

import numpy as np

from knots_sim import field


def test_broad_and_focused_release_differ_in_where():
    f = field.patch(120, seed=3)
    dist = np.sqrt(((f["pos"] - np.array(field.SPOT)) ** 2).sum(axis=1))
    near = dist < field.RADIUS
    out = {}
    for name in ("calm", "broad", "focused"):
        r = field.run(f, name, breaths=12)
        out[name] = (r["knot"], r["knot"] & ~np.isnan(r["released_s"]))
    knot, calm = out["calm"]
    _, broad = out["broad"]
    _, focused = out["focused"]
    assert calm.sum() <= 0.15 * knot.sum()  # without a breath, knots hold (a few poised at their threshold drift open)
    assert broad[~near].sum() > focused[~near].sum() + 3  # broad reaches knots everywhere
    # Beyond the knots that drift open anyway, focused releases lie closer to the spot than broad ones.
    extra = lambda freed: freed & ~calm
    assert dist[extra(focused)].mean() < dist[extra(broad)].mean() - 0.1
