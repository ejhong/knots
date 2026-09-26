"""PubMed through NCBI E-utilities: search, summaries, abstracts, and library entries.

Every paper in `src/data/papers.json` comes from this output, never from memory. Calls are paced under
NCBI's limit (three a second without a key), retried when rate-limited, and cached on disk so that
re-running an analysis does not query PubMed again.

    uv run python -m knots_sim.pubmed search "local cooling cutaneous vasoconstriction"
    uv run python -m knots_sim.pubmed abstract 12345678
    uv run python -m knots_sim.pubmed entry 12345678 --id smith2001
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
EUROPE_PMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/"
CACHE = Path(__file__).resolve().parents[1] / ".cache" / "pubmed"
_last_call = 0.0


def _get(path: str, base: str = BASE, **query: str) -> bytes:
    """One request (E-utilities by default): cached, paced, retried on HTTP 429."""
    global _last_call
    if base == BASE:
        query = {**query, "tool": "knots-sim"}
    url = base + path + ("?" + urllib.parse.urlencode(sorted(query.items())) if query else "")
    key = CACHE / (hashlib.sha1(url.encode()).hexdigest() + ".bin")
    if key.exists():
        return key.read_bytes()
    for attempt in range(6):
        wait = 0.5 - (time.monotonic() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.monotonic()
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                body = r.read()
            CACHE.mkdir(parents=True, exist_ok=True)
            key.write_bytes(body)
            return body
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise
            time.sleep(2 * 2**attempt)
    raise RuntimeError("unreachable")


def search(term: str, retmax: int = 10, sort: str = "relevance") -> tuple[int, list[str]]:
    """PMIDs for a PubMed query, and the total count."""
    r = json.loads(_get("esearch.fcgi", db="pubmed", term=term, retmax=str(retmax), sort=sort, retmode="json"))
    return int(r["esearchresult"]["count"]), r["esearchresult"]["idlist"]


def summaries(pmids: list[str]) -> dict[str, dict]:
    """esummary records by PMID."""
    if not pmids:
        return {}
    r = json.loads(_get("esummary.fcgi", db="pubmed", id=",".join(pmids), retmode="json"))["result"]
    return {p: r[p] for p in pmids if p in r}


def abstract(pmid: str) -> str:
    """The abstract as PubMed holds it, section labels kept."""
    root = ET.fromstring(_get("efetch.fcgi", db="pubmed", id=pmid, retmode="xml"))
    parts = []
    for node in root.iter("AbstractText"):
        text = "".join(node.itertext()).strip()
        label = node.get("Label")
        parts.append(f"{label}: {text}" if label else text)
    return "\n".join(parts)


def fulltext(pmid: str) -> str | None:
    """Open-access full text via Europe PMC, as plain paragraphs (None when not open access)."""
    hits = json.loads(_get("search", base=EUROPE_PMC, query=f"EXT_ID:{pmid} AND SRC:MED", format="json", resultType="core"))
    rec = next(iter(hits.get("resultList", {}).get("result", [])), None)
    if not rec or rec.get("isOpenAccess") != "Y" or not rec.get("pmcid"):
        return None
    root = ET.fromstring(_get(f"{rec['pmcid']}/fullTextXML", base=EUROPE_PMC))
    body = root.find("body")
    if body is None:
        return None
    paras = []
    for node in body.iter():
        if node.tag in ("title", "p"):
            text = re.sub(r"\s+", " ", "".join(node.itertext())).strip()
            if text:
                paras.append(("## " if node.tag == "title" else "") + text)
    return "\n".join(paras)


def doi(record: dict) -> str | None:
    for a in record.get("articleids", []):
        if a.get("idtype") == "doi":
            return a["value"]
    return None


def _name_case(name: str) -> str:
    """Older PubMed records spell surnames in capitals ("BURTON AC"); the library writes "Burton AC"."""
    surname, _, initials = name.rpartition(" ")
    if surname.isupper() and len(surname) > 1:
        surname = re.sub(r"[A-Z]+", lambda m: m.group(0).capitalize(), surname)
    return f"{surname} {initials}".strip() if surname else name


def entry(pmid: str, id: str, tags: list[str], note: str) -> dict:
    """A `papers.json` entry built only from PubMed's own record."""
    rec = summaries([pmid])[pmid]
    names = [_name_case(a["name"]) for a in rec["authors"] if a.get("authtype", "Author") == "Author"]
    authors = ", ".join(names[:3]) + (" et al." if len(names) > 3 else "")
    where = rec["source"]
    if rec.get("volume"):
        where += f" {rec['volume']}"
    pages = rec.get("pages") or (rec.get("elocationid") or "").replace("doi: ", "")
    if pages and not pages.startswith("10."):
        where += f":{pages}"
    d = doi(rec)
    out = {
        "id": id,
        "authors": authors,
        "year": int(rec["pubdate"][:4]),
        "title": rec["title"].rstrip("."),
        "venue": where,
    }
    if d:
        out["url"] = f"https://doi.org/{d}"
    out |= {"pmid": pmid, "kind": "paper", "tags": tags, "note": note}
    return out


def _main(argv: list[str]) -> None:
    cmd, *rest = argv
    if cmd == "search":
        count, ids = search(" ".join(rest), retmax=12)
        print(f"{count} results")
        for p, r in summaries(ids).items():
            first = r["authors"][0]["name"] if r["authors"] else "?"
            print(f"  {p}  {r['pubdate'][:4]}  {first:<18} {r['title'][:110]}")
    elif cmd == "abstract":
        for p in rest:
            r = summaries([p])[p]
            print(f"== {p} {r['pubdate'][:4]} {r['title']}\n{abstract(p)}\n")
    elif cmd == "fulltext":
        text = fulltext(rest[0])
        print(text if text else "(no open-access full text)")
    elif cmd == "entry":
        pmid, _, id = rest[:3]
        print(json.dumps(entry(pmid, id, [], ""), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    _main(sys.argv[1:])
