"""Length adaptation (knots_sim.adapt): a knot held long enough comes to hold at rest."""

import numpy as np
import pytest

from knots_sim import adapt as a
from knots_sim.models import vessel as v
from knots_sim.params import problems


@pytest.fixture(scope="module")
def p():
    return a.params(fitted=False)


@pytest.fixture(scope="module")
def V(p):
    return a.Vessel(p)


def test_adaptation_table_is_sound():
    assert problems("adapt") == []


def test_the_share_regains_the_measured_force(p):
    w, lo = p["width"], 1 + p["adapt_share"] * (a.SHORT - 1)
    g0 = np.exp(-(((a.SHORT - 1) / w) ** 2))
    g1 = np.exp(-(((a.SHORT / lo - 1) / w) ** 2))
    assert (g1 - g0) / (1 - g0) == pytest.approx(p["recovery_06"], abs=1e-6)


def test_an_unadapted_muscle_leaves_the_switch_as_it_was(p):
    s0, s1 = v.calibrate(v.params(fitted=False)), v.calibrate(p | {"lo": 1.0})
    assert (s1.Aopen, s1.Afold) == pytest.approx((s0.Aopen, s0.Afold))


def test_rest_is_stable_under_adaptation(p, V):
    for lo0 in (0.97, 1.03):
        r = a.run(p, [(0.0, V.urest)], hours=96, dt=600.0, lo0=lo0, ves=V)
        assert abs(r["lo"][-1] - 1) < abs(lo0 - 1) / 5
        assert r["x"][-1] == pytest.approx(V.xrest, rel=0.01)


def test_the_time_constant_matches_its_bracket(p, V):
    """martinezlemus2004: constricted to 61% of their diameter for 5 minutes, arterioles return to it when the drive is
    removed; after 4 hours they do not. (The time constant was chosen from this bracket: a check that it sits inside.)"""
    curve = V.curve(1.0)
    open_side = V.xs > V.xs[np.argmax(curve)]
    tone = float(np.interp(0.61 * V.xrest, V.xs[open_side], curve[open_side]))  # the tone that holds 61%
    for held_s, back in ((300.0, True), (4 * a.HOUR, False)):
        r = a.run(p, [(0.0, tone), (held_s, V.urest)], hours=held_s / a.HOUR + 0.05, ves=V, dt=30.0)
        narrowed = 1 - r["x"][-1] / V.xrest
        assert bool(narrowed < 0.03) == back


def test_a_knot_held_long_enough_outlasts_its_stress(p, V):
    S = 4.0 * V.urest
    brief = a.held(p, S, 0.5 * a.HOUR, ves=V)
    long = a.held(p, S, 3.0 * a.HOUR, ves=V)
    assert not brief["stays"] and long["stays"]
    assert long["aopen_at_end"] < V.urest < brief["aopen_at_end"]


def test_a_tone_that_cannot_hold_the_knot_cannot_set_it(V):
    assert a.time_to_set(V, 0.99 * V.Aopen0) is None
    assert a.time_to_set(V, 1.01 * V.Aopen0) is not None


def test_old_knots_let_go_with_a_flush_and_new_ones_without(p, V):
    S = 4.0 * V.urest
    new = a.released(p, 1.0, hours=2.0, ves=V)
    old = a.released(p, a.lo_after(V, S, 4 * a.HOUR), hours=2.0, ves=V)
    assert new["peak_flow"] == pytest.approx(1.0, abs=0.05)
    assert old["peak_flow"] > 2.0 and old["flush_h"] > 0.25
