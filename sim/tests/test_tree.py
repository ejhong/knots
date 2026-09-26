"""The tree: a parent's knot makes a cluster of its children, its release frees most of them, the hardest stay."""

import numpy as np

from knots_sim.models import tree
from knots_sim.params import problems, values


def test_tree_table_is_sound():
    assert problems("tree") == []


def test_a_parent_knot_shuts_its_children_and_its_release_frees_most():
    tv = values("tree")
    walls = np.array([[0.30, 0.25, 0.283, 0.317, 0.35]])
    t = tree.build(walls, tv["P_source"], tv["P_bed"], tv["ratio"])
    r = tree.run(t, tree.parent_inputs(t, np.array([0.28])), duration=tree.PRESS[1] + 6.0)
    s = tree.shut(t, r["x"])[:, 0, :]
    before = s[np.searchsorted(r["t"], tree.PRESS[0]) - 1]
    after = s[-1]
    assert before.all()  # parent and all four children held
    assert not after[0] and after[1:].sum() <= 1  # the parent open, and all but the hardest child with it


def test_siblings_on_a_rigid_feed_protect_each_other():
    out = tree.siblings()
    assert out["shut_by_surge"] <= 2  # each closure raises the pressure that holds the rest open
    assert out["Pn_after"] > out["Pn_rest"]
