"""The field guide (knots_sim/guide): what the site shows is current, every theory answers the same questions, and the
engine keeps the physics it claims."""

import json
import re

import numpy as np

from knots_sim.guide import export, scenes, senses


def test_the_site_data_is_current():
    idx = json.loads(export.INDEX.read_text())
    assert idx["run"]["inputs"] == export.inputs_hash(), "guide.json is stale: run `uv run python -m knots_sim.guide`"
    ids = {t["id"] for t in idx["theories"]}
    for s in scenes.SCENES:
        if s.film:
            film = json.loads((export.FILMS / f"{s.id}.json").read_text())
            assert film["run"] == idx["run"]["inputs"], f"{s.id}.json is from another run"
            assert set(film["theories"]) == ids


def test_every_theory_answers_the_same_questions():
    idx = json.loads(export.INDEX.read_text())
    asked = [tuple(t["id"] for t in th["traits"]) for th in idx["theories"]]
    assert all(a == asked[0] for a in asked)
    for th in idx["theories"]:
        for t in th["traits"]:
            assert t["mark"] in ("all", "some", "none", "silent", "not")
            assert t["text"] and not re.search(r"\bnan\b", t["text"])  # a missing number, not hyaluronan


def test_what_is_felt_fades_with_depth_and_grows_with_size():
    shallow, deep = senses.felt(1.0, 3.0, 2.0, 5.0, 0.01), senses.felt(1.0, 3.0, 2.0, 15.0, 0.01)
    assert shallow > deep > 0
    assert senses.felt(1.0, 20.0, 3.0, 12.0, 0.01) > senses.felt(1.0, 3.0, 3.0, 12.0, 0.01)  # a band beats a lump


def test_a_pressed_vessel_never_lets_go_under_the_hand():
    """The perforators' structural claim: pressure outside a shut vessel only helps keep it shut."""
    from knots_sim.guide import t1

    r = t1.Runner(k=4)
    run = r.run(scenes.BY_ID["hand"])
    under = run.t < scenes.BY_ID["hand"].hand_until
    for k in range(4):
        j = run.target[k]
        if run.held[0, k, j]:
            assert run.held[under, k, j].all(), f"setting {k}: a vessel under the hand let go while pressed"


def test_scenes_share_one_breath_and_one_stress():
    from knots_sim.guide.base import stress

    hold = np.array([0.5, 0.6])
    s = scenes.BY_ID["forms"]
    assert (stress(s, 0.0, hold, None) == 0).all() and (stress(s, 100.0, hold, None) == 1).all()
    assert np.allclose(stress(s, 300.0, hold, None), hold)


def test_a_latched_region_is_a_switch_at_the_holding_stress():
    """T2: the loop is set from the account's claims, so at the holding stress and unattended a held region stays held and
    an unheld one stays unlatched: its knots are switch states, not slow transients that fade by themselves."""
    from knots_sim.guide import t2
    from knots_sim.models import latch as lm

    r = t2.Runner(k=8)
    assert r.loop_ok.all()
    st = r.formed()
    h0 = lm.held(st)
    assert h0.any()
    s_eff = r.hold[:, None] * r.zone[None, :]
    for _ in range(9000):  # a quarter of an hour more at the same stress
        lm.step(r.P, st, s_eff, 0.0, 0.0, 0.1, t2.REST)
    assert (lm.held(st) == h0).all()


def test_a_jammed_layer_is_a_switch_at_the_holding_stress():
    """T4: at the typical place the holding stress's movement lies inside the band, where a jammed patch stays jammed and
    a fluid one stays fluid (coussot2002's bifurcation); the surge's is below it, the rest's above the band's floor."""
    from knots_sim.guide import t4
    from knots_sim.models import densification as dm

    r = t4.Runner(k=8)
    for k, p in enumerate(r.ps):
        roots = dm.steady(p["steep"], p["x_max"], float(r.u_mid[k]))
        assert len(roots) == 3 and roots[0] < r.xj[k] < roots[-1]
        assert r.U[k] * np.exp(-p["guard"]) < r.u_mid[k] < r.U[k]


def test_pressing_a_sensitised_nerve_never_quiets_it():
    """T5: a hand's pressure only adds to what a sensitised nerve fires; it cannot free the knot at the spot."""
    from knots_sim.guide import t5

    r = t5.Runner(k=8)
    run = r.run(scenes.BY_ID["hand"])
    k = np.arange(8)
    on = (run.t > 1.0) & (run.t < scenes.BY_ID["hand"].hand_until)
    assert (run.focal["pressed"][on] >= 0).all()
    assert (run.tender[on][:, k, run.target] >= run.focal["firing"][on] - 1e-9).all()
