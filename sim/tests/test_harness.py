"""The harness (knots_sim/exam.py): its shared trials and rules, and the matrix it writes."""

import json

import numpy as np
import pytest

from knots_sim import exam
from knots_sim.models import triggerpoint as tp
from knots_sim.theories import t3, t6


def test_a_record_reads_as_releases_and_cycles():
    t = np.arange(8.0)
    held = np.array([[1, 1, 0], [1, 1, 0], [1, 0, 1], [0, 0, 1], [1, 1, 0], [0, 1, 1], [1, 1, 0], [1, 1, 0]], bool)
    held0, rel = exam.releases(t, held, 1.0)
    assert held0.tolist() == [True, True, False]
    assert rel[0] == 2.0 and rel[1] == 1.0 and np.isnan(rel[2])
    cyc, best = exam.coming_and_going(t, held)
    assert cyc.tolist() == [1, 0, 2] and best.tolist() == [1.0, np.inf, 1.0]  # the middle one formed and stayed


def test_a_local_trial_starts_after_broad_breaths():
    f, p = exam.Patch("focused"), exam.Patch("press")
    assert f.start == p.start == exam.PREP == exam.BREATHS * exam.PERIOD
    assert f.at(10.0) == (True, False, False) and f.at(exam.PREP + 1) == (True, True, False)
    assert p.at(exam.PREP + 1) == (True, True, True)
    assert p.at(exam.PREP + exam.PRESS_FOR + 1) == (True, False, False)
    assert exam.Patch("hold").at(1.0) == (False, False, False)
    assert exam.Patch("broad").duration == exam.PREP + 5 and exam.Patch("one_breath").at(exam.PERIOD + 1)[0] is False


def test_slow_breathing_calms_toward_its_size():
    assert exam.calm(0.0, 0.2, 60.0) == 0.0
    assert exam.calm(600.0, 0.2, 60.0) == pytest.approx(0.2, rel=1e-3)


def test_perception_sets_its_scale_by_the_shared_rule():
    """The typical place is made a knot by the surge, kept one by the holding stress, and not made one by it alone."""
    for p in t6.sample(8, 3):
        a_s = 1 - np.exp(-(exam.SURGE[1] - exam.SURGE[0]) / p["tau_arousal"])
        surge = (1 + p["kappa"] * a_s) * (1 + p["guard"]) * p["u_scale"]
        hold = (1 + p["kappa"] * p["hold"]) * (1 + p["guard"] * p["hold"]) * p["u_scale"]
        assert surge > 1 and 1 - p["hysteresis"] < hold < 1


def test_trigger_points_set_their_scale_by_the_shared_rule():
    """At the window's middle a unit at full share is contracted by the surge and kept so; unsurged, it stays relaxed."""
    ps = t3.sample(8, 3)
    ws = t3.windows(ps)
    ps, ws = [p for p, w in zip(ps, ws) if w][:3], [w for w in ws if w][:3]
    assert ps
    P = {k: np.repeat([p[k] for p in ps], 2) for k in ps[0] if k != "seed"}
    a0 = np.repeat([np.sqrt(w[0] * w[1]) for w in ws], 2)
    surged = np.tile([True, False], len(ps))

    def inputs(t, st):
        s = np.where(surged & (exam.SURGE[0] <= t) & (t < exam.SURGE[1]), 1.0, P["hold"])
        return s, np.zeros(len(a0)), np.zeros(len(a0)), 1.0

    c = tp.simulate(P, a0, inputs, exam.T0, dt=0.05, every=100)["state"].c
    assert (c[surged] > tp.HELD).all() and (c[~surged] < tp.HELD).all()


def test_a_press_lets_a_middle_knot_go_in_its_quoted_time():
    ps = [p for p in t3.sample(8, 3) if tp.band(p, p["hold"])][:3]
    P = {k: np.array([p[k] for p in ps]) for k in ps[0] if k != "seed"}
    a0 = np.array([(lambda b: b[0] + 0.5 * (b[1] - b[0]))(tp.band(p, p["hold"])) for p in ps])
    st = [tp.held_state(p, a, p["hold"]) for p, a in zip(ps, a0)]
    state = tp.State(*(np.array(x) for x in zip(*st)))
    r = tp.simulate(P, a0, lambda t, s: (P["hold"], np.zeros(len(ps)), P["palpation"], 1.0), 200.0, state=state)
    let_go = r["t"][np.argmax(r["c"] < tp.HELD, axis=0)]
    assert let_go == pytest.approx(P["tau_press"], rel=0.1)


def test_the_matrix_is_current_and_well_formed():
    m = json.loads(exam.SITE.read_text())
    assert m["run"]["inputs"] == exam.inputs_hash(), "the matrix is stale: run `uv run python -m knots_sim.exam`"
    assert m["exam"]["sha256"] == exam.sealed()["seal"]["sha256"]
    parts = [p.id for p in exam.PARTS]
    assert [p["id"] for p in m["parts"]] == parts
    assert [t["id"] for t in m["theories"]] == [exam._theory(n).ID for n in exam.THEORIES]
    for t in m["theories"]:
        for v in t["variants"]:
            assert list(v["cells"]) == parts
            for pid, c in v["cells"].items():
                assert c in (exam.SILENT, exam.NOT_RUN) or 0 <= c <= 1, (t["id"], v["name"], pid)
                if not isinstance(c, str):
                    assert len(v["passes"][pid]) == t["samples"] and np.mean(v["passes"][pid]) == pytest.approx(c, abs=1e-3)
            assert 0 <= v["joint"] <= min(c for c in v["cells"].values() if not isinstance(c, str))
            if v["count"] is not None:
                assert v["count"]["lo"] <= v["count"]["median"] <= v["count"]["hi"] <= v["count"]["units"]


def test_the_findings_note_names_the_matrix_run():
    from knots_sim.findings import EXAM_OUT

    m = json.loads(exam.SITE.read_text())
    assert f"inputs {m['run']['inputs']}" in EXAM_OUT.read_text(), "findings 004 is stale: run `uv run python -m knots_sim.exam`"
