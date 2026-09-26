"""The vessel switch: its physics, its calibration to measurements, and the freshness of what the site shows."""

import json
import os
from pathlib import Path

import numpy as np
import pytest

from knots_sim import codegen, export, params
from knots_sim.models import vessel as v

SITE = Path(__file__).resolve().parents[2] / "src"


def test_parameter_tables_are_sound():
    for name in ("vessel", "checks"):
        assert params.problems(name) == []


@pytest.mark.skipif(not os.environ.get("KNOTS_NET"), reason="set KNOTS_NET=1 to check quotes against PubMed")
def test_every_quote_is_in_its_source():
    for name in ("vessel", "checks"):
        assert [k for k, verdict, _ in params.verify(name) if verdict != "ok"] == []


def test_relaxed_vessel_at_100_mmHg_has_radius_r100():
    # The definition of r100: a relaxed vessel's passive tension balances 100 mmHg at x = 1.
    p = v.params(fitted=False, P=100.0)
    s = v.calibrate(p)
    assert s.xp == pytest.approx(1.0, abs=2e-3)


def test_the_band_is_ordered_and_rest_sits_below_it():
    s = v.calibrate(v.params(fitted=False))
    assert s.bistable
    assert 0 < s.urest < s.Aopen < s.Afold < 1
    assert s.xp > s.xrest > s.xfold > v.values("vessel")["xc"]


def test_a_shut_vessel_stays_shut_inside_the_band_and_reopens_below_it():
    p = v.params(fitted=False)
    s = v.calibrate(p)
    inside = s.Aopen + 0.3 * (s.Afold - s.Aopen)
    below = s.Aopen - 0.05
    shut = np.array([p["xc"], inside, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
    for tone, stays_shut in ((inside, True), (below, False)):
        u = np.tile([tone, 0.0, 0.0], (3000, 1))
        y = v.rk4(p, u, 0.02, y0=shut.copy())
        assert bool(y[-1, 0] < 1.5 * p["xc"]) == stays_shut


def test_an_open_vessel_snaps_shut_above_the_fold():
    p = v.params(fitted=False)
    s = v.calibrate(p)
    u = np.tile([s.Afold + 0.05, 0.0, 0.0], (3000, 1))
    y = v.rk4(p, u, 0.02)
    assert y[-1, 0] < 1.5 * p["xc"]


def test_fitted_timings_reproduce_their_targets():
    p = v.params()
    low, when, back = v.gasp_response(p)
    rise, peak = v.hyperaemia(p)
    assert low == pytest.approx(1 - p["gasp_drop"], abs=0.01)
    assert back == pytest.approx(v.GASP_RECOVERY, abs=0.5)
    assert peak == pytest.approx(p["porh_peak_time"], abs=0.3)
    assert 3 <= p["tau_down"] <= 20 and 1 <= p["tau_nerve"] <= 10  # within their stated ranges


def test_squeezed_vessels_widen_as_measured():
    # clifford2006: +16% after one 1 s squeeze (peak 4.1 s), +14% after 5 s (4.6 s), +27% after five (2.8 s).
    p = v.params()
    got = {name: v.squeeze_response(p, pulses) for name, pulses in v.SQUEEZES.items()}
    for name, (rise, when) in got.items():
        assert rise == pytest.approx(p[f"squeeze_rise_{name}"], abs=0.03), name
        assert when == pytest.approx(p[f"squeeze_peak_{name}"], abs=0.7), name
    assert abs(got["long"][0] - got["one"][0]) < 0.03  # the wall answers the change, not how long it lasts
    assert got["five"][0] > got["one"][0] + 0.05  # several changes add up


def test_no_movement_leaves_the_movement_states_at_rest():
    p = v.params()
    r = v.run(p, v.Score(duration=60, stress=[(5, 0.1)], gasps=[20], presses=[(30, 40, 80.0)]), 0.02)
    assert max(abs(r[k]).max() for k in ("ml", "w", "z")) == 0.0


def test_the_breath_releases_easy_knots_before_deep_ones():
    from knots_sim import breath

    p = v.params()
    easy = breath.release_time(p, breath.score(p, 0.05, "movement", 0.2), "movement", 0.2)
    deep = breath.release_time(p, breath.score(p, 0.65, "movement", 0.2), "movement", 0.2)
    even = breath.release_time(p, breath.score(p, 0.05, "even", 0.03), "even", 0.03)
    assert easy is not None and easy < 100 and deep is None
    assert even is None  # an even swing in drive holds even an easy knot


def test_generated_typescript_is_current():
    assert (SITE / "sim" / "models" / "vessel.ts").read_text() == codegen.vessel_ts()


def test_site_data_is_from_the_current_model():
    for name in ("vessel.json", "adapt.json"):
        data = json.loads((SITE / "data" / "sim" / name).read_text())
        assert data["run"]["inputs"] == export._inputs_hash(), f"{name}: run `uv run python -m knots_sim.export`"
