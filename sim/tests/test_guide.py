"""The field guide (knots_sim/guide): what the site shows is current, every theory answers the same questions, and the
engine keeps the physics it claims."""

import json

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
            assert t["text"] and "nan" not in t["text"]


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
