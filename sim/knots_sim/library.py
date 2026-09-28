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
    # T6, perception: what the breath, attention, stress, competing pain and overbreathing do to what is felt.
    ("21939499", "busch2012", ["breath", "mind"],
     "Deep, slow breathing with relaxation raised pain thresholds and lowered sympathetic arousal; the same breathing done with effortful attention did neither."),
    ("20079569", "zautra2010", ["breath", "mind"],
     "Breathing at half the normal rate lowered the intensity and unpleasantness of moderate heat pain, less reliably in fibromyalgia."),
    ("23906637", "arsenault2013", ["breath", "mind"],
     "Pain from brief shocks was rated lower near the end of the in-breath than of the out-breath, and the effect was small: the breath's phase is not what makes relaxation analgesic."),
    ("28240995", "jafari2017", ["breath", "mind"],
     "Systematic review: pain raises breathing's flow, rate and volume, and paced slow breathing reduces pain in some studies, by mechanisms not yet known."),
    ("2616184", "miron1989", ["mind"],
     "Attending to a painful heat stimulus makes it more intense and more unpleasant; attending elsewhere makes it less."),
    ("20493631", "moont2010", ["mind"],
     "Pain inhibits pain: a painful stimulus on one hand lessens pain elsewhere (conditioned pain modulation), independently of distraction."),
    ("23950894", "crettaz2013", ["mind"],
     "A standardised social stressor raised sensitivity to heat pain in healthy people, and to pressure pain as well in fibromyalgia."),
    ("2004255", "macefield1991", ["breath", "nerve"],
     "Overbreathing brings tingling in the hands, face and trunk once alveolar carbon dioxide has fallen by about 20 mmHg: peripheral axons grow excitable everywhere."),
    # The shared breath: minutes of slow breathing lower sympathetic drive.
    ("20520613", "oneda2010", ["breath", "vascular"],
     "Fifteen minutes of device-guided slow breathing (about 5.5 breaths a minute) lowered muscle sympathetic nerve activity by 8 bursts a minute; calm music lowered blood pressure but not sympathetic activity."),
    ("31436511", "adler2019", ["breath", "vascular"],
     "In young normotensive women and men, 15 minutes of slow breathing lowered muscle sympathetic burst incidence by 5 bursts per 100 heartbeats and blood pressure by 3 mmHg."),
    # Migration: how far tissue pressure rises when blood volume does.
    ("9110285", "christ1997", ["vascular"],
     "Subcutaneous interstitial fluid pressure in the calf, -0.9 mmHg at rest, rose only to about 1.6 mmHg as venous congestion filled the tissue."),
    # T3, trigger points: how fast pressure releases one, and the twitch.
    ("31060367", "pecosmartin2019", ["trigger-points"],
     "Pressure release held on a latent trigger point for 60 or 90 s raised its pressure-pain threshold more than 30 s did."),
    ("12370877", "hou2002", ["trigger-points"],
     "Ischaemic compression eased trigger-point pain either at low pressure held 90 s or at higher pressure held 30 s: pressure and time trade."),
    ("11562554", "chen2001", ["trigger-points", "animals"],
     "Dry needling that elicited local twitch responses cut the spontaneous electrical activity of rabbit trigger spots to about half."),
    # Other candidate mechanisms for full coverage.
    ("1943863", "johansson1991", ["trigger-points", "nerve"],
     "A proposed loop: metabolites of static contraction drive the gamma system and the muscle spindles, raising stiffness and metabolites again, so muscle tension perpetuates itself and spreads to other muscles."),
    # A breath aimed at a place (route B6): can the sympathetic signal, or the mind, act on one region?
    ("11506981", "morrison2001", ["vascular", "nerve"],
     "The sympathetic system is not one global switch: a review of tissue-specific output channels that can be activated or inhibited in combination."),
    ("9421582", "vissing1997", ["vascular", "nerve"],
     "In humans, sympathetic outflow to skin and to muscle can be activated in a highly dissociated pattern: central command drives the skin's, feedback from working muscle the muscle's."),
    ("16504320", "casiglia2006", ["vascular", "mind"],
     "Under hypnosis, suggesting only the forearm was in warm water dilated that forearm (resistance -18%, flow +43%); suggesting the whole body dilated vessels everywhere."),
    ("2842815", "freedman1988", ["vascular", "mind"],
     "Learned finger warming with temperature feedback was blocked by propranolol infused in that arm only, and not by blocking the finger's nerves."),
    ("1854864", "freedman1991", ["vascular", "mind"],
     "A review: learned finger warming works through a non-neural, beta-adrenergic mechanism rather than through less sympathetic activity; learned cooling works through the sympathetic nerves."),
    # The instrument stage: what a recording at a release would show, and how noisy it is.
    ("20542492", "roustit2010", ["vascular", "imaging"],
     "Laser speckle contrast imaging of forearm skin is reproducible from week to week: 8% for the peak of reactive hyperaemia, 15% for the plateau of local heating."),
    ("19566318", "odoherty2009", ["vascular", "imaging"],
     "Laser speckle perfusion imaging is sensitive to the skin's superficial, nutritional supply; a laser Doppler line scanner to deeper vessels."),
    ("35358501", "schwartz2022", ["vascular", "imaging"],
     "Laser speckle and laser Doppler reproducibly track the skin's reflex vasoconstriction to cooling; the shallowest sampling sees a smaller response than the deepest."),
    ("7990721", "wardell1994", ["vascular", "imaging"],
     "Normal skin has high- and low-perfusion spots a few millimetres apart; each spot's perfusion varies over time, but the relative levels between neighbouring spots persist."),
    # What the hand feels: candidates for the bump itself.
    ("27008292", "bicket2016", ["fascia", "anatomy"],
     "\"Back mice\": firm, rubbery, mobile nodules in the low back that may be fat herniated through the fascial layers; tender ones mimic myofascial pain."),
    ("33066978", "martineznunez2021", ["fascia", "anatomy"],
     "Copeman nodules (episacral lipomas) are common: fat herniated beneath the fascia through weakened areas of the thoracodorsal fascia, usually on both sides."),
    ("29944114", "minerbi2018", ["trigger-points", "models"],
     "A model of a postural muscle whose motor units take turns: more load or less strength shortens each unit's rest, a route into the energy crisis that replaces the Cinderella hypothesis."),
    ("28098584", "rathbone2017", ["trigger-points", "critique"],
     "Examiners agree only moderately on where trigger points are by touch (kappa 0.45); tenderness and the patient recognising the pain agree best."),
    # A fast switch with a muscular on-state: spinal motor neurons that latch on.
    ("9637398", "gorassini1998", ["nerve", "models"],
     "Self-sustained firing measured in people: a motor unit recruited by a brief input (tendon vibration) kept firing after the input stopped, with the common drive unchanged."),
    ("18381974", "heckman2008", ["nerve", "models"],
     "Persistent inward currents in motor neurons amplify synaptic input up to fivefold or more, set by serotonin and noradrenaline; brief inputs can start long-lasting self-sustained firing (bistable behaviour), and turning it off usually needs inhibitory input."),
    ("38502567", "goodlich2024", ["nerve"],
     "Blocking serotonin 5-HT2 receptors shortened human motor units' self-sustained firing: units recruited by extra drive could not switch off when it was removed, and less so under the blocker."),
    ("26491094", "turo2015", ["trigger-points", "imaging"],
     "Ultrasound elastography measured the stiffer share of the trapezius around trigger points falling as they responded to dry needling."),
    ("36106775", "maitland2022", ["anatomy", "imaging"],
     "A single motor unit's territory measured with ultrasound-guided scanning EMG in tibialis anterior: 1.5 to 14.7 mm across, 7.2 mm on average."),
    ("17369051", "cescon2008", ["anatomy", "imaging"],
     "Over the upper trapezius the fat beneath the skin measured 3 to 18 mm by ultrasound, and the muscle's innervation zone lay mid-way between C7 and the acromion."),
    ("2923241", "segal1989", ["vascular", "animals"],
     "Dilations and constrictions started on an arteriole propagate along its wall both ways, decaying with a length constant of about 1.9 mm; those started on daughter vessels enter the parent and sum there."),
    ("1858919", "segal1991", ["vascular", "animals"],
     "A dilation started at the end of a terminal arteriole with no flow was conducted more than 1 mm upstream into its parent, and blood flowed into the capillaries it fed."),
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
