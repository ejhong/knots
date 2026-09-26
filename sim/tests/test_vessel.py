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
    shut = np.array([p["xc"], inside, 0.0, 0.0, 0.0])
    for tone, stays_shut in ((inside, True), (below, False)):
        u = np.tile([tone, 0.0], (3000, 1))
        y = v.rk4(p, u, 0.02, y0=shut.copy())
        assert bool(y[-1, 0] < 1.5 * p["xc"]) == stays_shut


def test_an_open_vessel_snaps_shut_above_the_fold():
    p = v.params(fitted=False)
    s = v.calibrate(p)
    u = np.tile([s.Afold + 0.05, 0.0], (3000, 1))
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


def test_generated_typescript_is_current():
    assert (SITE / "sim" / "models" / "vessel.ts").read_text() == codegen.vessel_ts()


def test_site_data_is_from_the_current_model():
    data = json.loads((SITE / "data" / "sim" / "vessel.json").read_text())
    assert data["run"]["inputs"] == export._inputs_hash(), "run `uv run python -m knots_sim.export`"
