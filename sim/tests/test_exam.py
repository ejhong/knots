"""The exam (observations/spec.yaml): sealed, quoted faithfully, and well formed."""

import hashlib
import json
import re
import unicodedata
from pathlib import Path

import yaml

SIM = Path(__file__).resolve().parents[1]
ROOT = SIM.parent
SPEC = SIM / "observations" / "spec.yaml"
SOURCES = {  # where each kind of quote can be checked
    "the introduction": ROOT / "src" / "data" / "tour.ts",
    "the author": SIM / "observations" / "author.md",
}


def _norm(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", unicodedata.normalize("NFKC", s))  # the introduction's text carries HTML tags
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip().lower()


def test_the_exam_matches_its_seal():
    spec = yaml.safe_load(SPEC.read_text())
    seals = yaml.safe_load((SIM / "observations" / "seal.yaml").read_text())["seals"]
    last = seals[-1]
    assert spec["status"] == "sealed" and spec["version"] == last["version"]
    digest = hashlib.sha256(SPEC.read_bytes()).hexdigest()
    assert digest == last["sha256"], "the sealed exam changed: make a new, dated version (observations/seal.yaml)"


def test_every_quote_is_in_its_source():
    spec = yaml.safe_load(SPEC.read_text())
    texts = {k: _norm(p.read_text()) for k, p in SOURCES.items()}
    for o in spec["observations"]:
        for w in o.get("words", []):
            source = next(k for k in SOURCES if w["from"].startswith(k))
            assert _norm(w["quote"]) in texts[source], f"{o['id']}: not found in {SOURCES[source].name}: {w['quote'][:60]}"


def test_the_exam_is_well_formed():
    spec = yaml.safe_load(SPEC.read_text())
    groups = {g["id"] for g in spec["groups"]}
    papers = {p["id"] for p in json.loads((ROOT / "src" / "data" / "papers.json").read_text())}
    ids = [o["id"] for o in spec["observations"]]
    assert len(ids) == len(set(ids))
    for o in spec["observations"]:
        assert o["group"] in groups and o["title"] and o["text"]
        assert o["evidence"] in ("S", "M")
        if o["evidence"] == "M":
            assert o.get("sources") and set(o["sources"]) <= papers
        else:
            assert o.get("words"), f"{o['id']}: a self-report needs its words"
