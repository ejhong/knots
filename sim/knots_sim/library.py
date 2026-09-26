"""Papers the simulation stands on, added to the site's library from PubMed's own records.

Each entry is built by `pubmed.entry` (authors, title, venue, DOI straight from E-utilities); only the id,
tags and one-sentence note are written here. Run it to merge them into `src/data/papers.json`:

    uv run python -m knots_sim.library
"""

from __future__ import annotations

import json
from pathlib import Path

from . import pubmed

PAPERS = Path(__file__).resolve().parents[2] / "src" / "data" / "papers.json"

# pmid, id, tags, note
NEW = [
    ("14810937", "burton1951", ["vascular", "models"],
     "Why a small vessel can snap shut: with active tension in its wall, Laplace's law leaves it no stable open state below a critical pressure."),
    ("14810938", "nichol1951", ["vascular", "models"],
     "The companion measurements: whole vascular beds stop flowing at a critical closing pressure, the instability Burton predicted."),
    ("41745371", "miller2026", ["vascular", "models"],
     "Critical closing pressure read as a binary threshold: arterioles snap shut when smooth-muscle tension exceeds intraluminal pressure, and reopen only when tone falls, external pressure is relieved or inflow pressure rises."),
    ("434167", "bohlen1979", ["vascular", "animals"],
     "Arterioles held closed by nerves: cutting them opened 22% more third-order arterioles in normal rats."),
    ("7114760", "cutting1982", ["vascular", "perforators"],
     "Skin flaps show the critical closing phenomenon: blood does not flow until perfusion pressure passes a threshold set in part by vascular smooth muscle tone."),
    ("17172274", "zhang2007", ["vascular", "animals"],
     "Small arteries of about 240 µm develop a maximal active wall tension of 3.4 mN/mm: the strength with which a vessel can close itself."),
    ("36429103", "elassar2022", ["vascular"],
     "Human small arteries from donors over 65 contract more strongly to adrenergic stimulation; force is close to maximal at 90% of the circumference they would have at 100 mmHg."),
    ("2217559", "mulvany1990", ["vascular"],
     "Small arteries, below about 500 µm, actively regulate peripheral resistance: the size class of most perforators."),
    ("1115244", "fronek1975", ["vascular", "animals"],
     "Microvascular pressures measured directly: in arterioles of 70 µm and wider, pressure tracks systemic arterial pressure."),
    ("7493417", "lau1995", ["breath", "vascular"],
     "A deep inspiratory gasp cuts fingertip skin blood flow by 59–71%, graded with the depth of the breath."),
    ("42028531", "mayrovitz2026", ["breath", "vascular"],
     "The inspiratory gasp reflex reviewed: skin vessels constrict 3.6–3.8 s after a gasp, most deeply at 4.6–5.2 s, and recover over about half a minute."),
    ("33959270", "alexandrou2021", ["vascular", "imaging"],
     "Reactive hyperaemia in forearm skin by laser speckle imaging: after an occlusion, flow rises 187% above baseline and peaks about 11 s after release."),
    ("17901123", "lorenzo2007", ["vascular", "nerve"],
     "The skin's reactive hyperaemia is carried largely by sensory nerves and BKCa channels, not prostanoids."),
    ("12744548", "charkoudian2003", ["vascular"],
     "Skin blood flow is set by sympathetic nerves and local temperature: from minimal levels under local cooling to 6–8 L/min in heat."),
    ("9195861", "dedear1997", ["models"],
     "How fast skin loses heat: about 4.5 W/m²·K by radiation and 3.4 W/m²·K by convection in still air."),
    ("30040133", "fede2018", ["fascia"],
     "Hyaluronan measured in human fasciae: 6 µg/g over trapezius and deltoid, about 30–35 µg/g in fascia lata and rectus sheath, 90 µg/g in the retinacula."),
    ("11749156", "krause2001", ["fascia", "models"],
     "Hyaluronan in physiological saline stays a Newtonian liquid over a wide range of shear rates, with no sign of gel formation without protein."),
    ("29542009", "nicholls2018", ["fascia", "models"],
     "Healthy synovial fluid, far richer in hyaluronan than fascia, has a zero-shear viscosity of 1–175 Pa·s: an upper bound for any hyaluronan collar."),
    ("10754597", "nakayama2000", ["fascia"],
     "Normal knee joint fluid in healthy young adults holds 3.4 mg/ml of hyaluronan: tens to hundreds of times the fascia's."),
    ("1858859", "rembold1991", ["vascular", "models"],
     "In arterial smooth muscle, relaxation is paced by the fall of calcium, not by latch-bridge detachment: the latch holds only while the calcium signal lasts."),
    ("16333357", "murphy2005", ["vascular", "models"],
     "The latch-bridge hypothesis reviewed: in sustained contractions calcium, phosphorylation and ATP use fall while force is held."),
    # Movement as a release: stretch, compression and the pulse lower smooth muscle's force.
    ("1120194", "ljung1975", ["vascular", "animals"],
     "Rhythmic stretch of vascular smooth muscle cuts its active force at once, by an amount set by the stretch's size and rate; even the pulse may ease arterial tone."),
    ("16497720", "clifford2006", ["vascular", "animals"],
     "Muscle feed arteries squeezed shut widen within seconds of release: by 16% after one 1 s compression, 14% after one of 5 s, and 27% after five of 1 s. Repeated compressions add up; a longer one does not."),
    ("8888697", "goto1996", ["vascular", "animals"],
     "In toned coronary arterioles, a larger pressure pulse at the same mean pressure widens the lumen: the pulse itself dilates, with or without the endothelium."),
    ("37945735", "neutel2023", ["vascular", "animals"],
     "Aortic smooth muscle de-stiffens after bouts of high cyclic stretch and re-stiffens slowly; the muscle has to be contracted and stretched for it to happen."),
    ("17538621", "trepat2007", ["models"],
     "After a transient stretch the living cell's cytoskeleton fluidizes, in the same way across cell types: a universal physical response."),
    ("9018525", "fredberg1996", ["breath", "models"],
     "Airway smooth muscle stretched as in breathing: the latch is a low-friction contractile state, which may be why a deep breath fails to reopen the airways in asthma."),
    ("10051279", "fredberg1999", ["breath", "models"],
     "The breath keeps airway smooth muscle from freezing: tidal stretch perturbs myosin binding and biases the muscle toward lengthening; without it the muscle virtually freezes at its static length."),
    # The wall's own numbers: how much force the muscle keeps when short, and how thick the wall is.
    ("479823", "mulvany1979", ["vascular", "animals", "models"],
     "Small arteries' active tension falls with shortening along a line that reaches zero at 0.38 of the optimal circumference: a nearly shut vessel's muscle pulls weakly."),
    ("7794571", "schiffrin1995", ["vascular"],
     "Human subcutaneous resistance arteries: the media is 5.2% of the lumen diameter in normotensive people, 7.5-8% in untreated hypertension."),
    # Held long enough, smooth muscle adapts to the length it is held at: a vessel held shut can come to stay shut.
    ("14977879", "martinezlemus2004", ["vascular", "animals"],
     "Arterioles constricted for 5 minutes relax fully when the drive is removed; after 4 hours they do not, and their muscle cells have repositioned to hold the smaller diameter."),
    ("12714327", "hill2003", ["vascular", "animals"],
     "After 4 hours of constriction, arterioles relax more slowly when the drive is removed; the hold still needs calcium, and goes at once without it."),
    ("11844933", "bakker2002", ["vascular", "animals"],
     "Resistance arteries kept actively constricted for 3 days remodel inward, their relaxed lumen 10-16% smaller; kept narrow without tone, they do not."),
    ("18218913", "syyong2008", ["vascular", "animals"],
     "Pulmonary arterial smooth muscle shortened to 0.6 of its length regains 73% of the force it lost, along a single exponential: the muscle adapts to the length it is held at."),
    ("7730790", "pratusevich1995", ["models", "animals"],
     "Airway smooth muscle regains its force after a change of length over 5-6 contractions at 5-minute intervals, and its adapted force varies little over a threefold range of length."),
    ("21239639", "bednarek2011", ["vascular", "animals"],
     "Arterial smooth muscle shortened by a fifth regains force over three contractions, by adding actin filaments; released from 1.25 to 0.75 of its optimal length, its sustained force rises by half."),
    ("12626491", "naghshin2003", ["models", "animals"],
     "Airway muscle held short for a week shifts its optimal length down by 38%, and the shift no longer fully reverses: after 3 days it still did."),
    ("21902815", "tuna2012", ["vascular", "models"],
     "Review: vascular smooth muscle adapts its length like airway and bladder muscle; under strong constriction this may prevent immediate full dilation and lead to inward remodelling."),
    ("24497993", "vanbavel2014", ["vascular", "models"],
     "A model of small arteries regulated by four adaptive processes (tone, smooth-muscle length adaptation, matrix rearrangement, growth): leave any one out and regulation fails, in some cases with unstable structure."),
    ("25729015", "ansell2015", ["breath", "animals"],
     "A caution: whole airways held inflated or deflated for about 50 minutes showed no length adaptation within physiological ranges."),
    # Other candidate mechanisms for full coverage.
    ("1943863", "johansson1991", ["trigger-points", "nerve"],
     "A proposed loop: metabolites of static contraction drive the gamma system and the muscle spindles, raising stiffness and metabolites again, so muscle tension perpetuates itself and spreads to other muscles."),
]

# Existing entries that the simulation also leans on gain the models tag.
RETAG = {"hai1988": "models"}


def merge() -> list[str]:
    papers = json.loads(PAPERS.read_text())
    have = {p["id"] for p in papers}
    added = []
    for pmid, id, tags, note in NEW:
        if id in have:
            continue
        papers.append(pubmed.entry(pmid, id, tags, note))
        added.append(id)
    for p in papers:
        if p["id"] in RETAG and RETAG[p["id"]] not in p["tags"]:
            p["tags"].append(RETAG[p["id"]])
    papers.sort(key=lambda p: p["id"])
    PAPERS.write_text(json.dumps(papers, ensure_ascii=False, indent=1) + "\n")
    return added


if __name__ == "__main__":
    print("added:", ", ".join(merge()) or "nothing new")
