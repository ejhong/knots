/**
 * A short history of knots: how medicine, anatomy and the traditions came
 * to the same ground. Years are of first publication.
 */
export interface Moment {
  year: string;
  text: string;
  ref?: string;
  kind?: 'medicine' | 'anatomy' | 'tradition' | 'essay';
}

export const TIMELINE: Moment[] = [
  { year: 'c. 100 BCE', kind: 'tradition', text: 'The Huangdi Neijing describes the sinew channels, each of which “knots” (結) at bony prominences, and the cou li — the texture between skin and flesh where wind enters.', ref: 'lingshu' },
  { year: '7th c.', kind: 'tradition', text: 'Sun Simiao names the ashi points — tender spots found by pressing, named for the patient’s cry.' },
  { year: '15th c.', kind: 'tradition', text: 'The Haṭha Yoga Pradīpikā counts 72,000 nāḍīs and describes the piercing of the three granthis — the knots of Brahma, Viṣṇu and Rudra.', ref: 'hyp' },
  { year: '1843', kind: 'medicine', text: 'Froriep describes “Muskelschwiele” — muscle calluses — hard, tender places in rheumatic muscle.' },
  { year: '1904', kind: 'medicine', text: 'Gowers coins “fibrositis” for the tender, painful lumps of lumbago.' },
  { year: '1919', kind: 'medicine', text: 'Schade proposes “myogelosis”: the hardening is muscle colloid turned to gel — a gel theory seventy years before hyaluronan.' },
  { year: '1936', kind: 'anatomy', text: 'Bolton, Carmichael and Stürup record that a deep inspiration constricts the skin’s vessels within seconds.', ref: 'bolton1936' },
  { year: '1938', kind: 'medicine', text: 'Kellgren injects hypertonic saline into muscles and maps the referred pain that follows.' },
  { year: '1952', kind: 'medicine', text: 'Travell and Rinzler publish the first maps of myofascial referred-pain patterns.', ref: 'travell1952' },
  { year: '1977', kind: 'medicine', text: 'Melzack and colleagues find a 71% correspondence between trigger points and acupuncture points for pain.', ref: 'melzack1977' },
  { year: '1983', kind: 'medicine', text: 'Travell and Simons publish The Trigger Point Manual.', ref: 'travell1983' },
  { year: '1986', kind: 'anatomy', text: 'Segal and Duling show that a dilation conducts along an arteriole’s wall, upstream toward its feed.', ref: 'segal1986' },
  { year: '1987', kind: 'anatomy', text: 'Taylor and Palmer map the angiosomes: about forty source-artery territories and an average of 374 major perforators.', ref: 'taylor1987' },
  { year: '1988', kind: 'anatomy', text: 'Heine reports that about 80% of acupoints sit where a vessel–nerve bundle perforates the superficial fascia. Hai and Murphy model the smooth-muscle latch.', ref: 'heine1988' },
  { year: '1990', kind: 'medicine', text: 'The American College of Rheumatology fixes eighteen tender points for fibromyalgia.', ref: 'wolfe1990' },
  { year: '1993', kind: 'medicine', text: 'Hubbard and Berkoff record spontaneous needle-EMG activity at trigger points.', ref: 'hubbard1993' },
  { year: '1994', kind: 'medicine', text: 'McNulty and colleagues: mental arithmetic turns up the activity at a trigger point but not beside it. Quintner and Cohen propose the nerve alternative.', ref: 'mcnulty1994' },
  { year: '2002', kind: 'anatomy', text: 'Langevin and Yandow: 80% of acupoints lie on connective-tissue planes.', ref: 'langevin2002' },
  { year: '2005', kind: 'medicine', text: 'Shah’s microdialysis samples the acidic, mediator-rich milieu inside active trigger points.', ref: 'shah2005' },
  { year: '2009', kind: 'anatomy', text: 'Sikdar images trigger points as stiff hypoechoic nodules. Saint-Cyr names the perforasome.', ref: 'saintcyr2009' },
  { year: '2011', kind: 'anatomy', text: 'Stecco proposes hyaluronan densification; Langevin measures 20% less fascial glide in chronic low back pain.', ref: 'stecco2011' },
  { year: '2015', kind: 'medicine', text: 'Quintner, Bove and Cohen publish a critical evaluation of the trigger-point construct.', ref: 'quintner2015' },
  { year: '2017', kind: 'tradition', text: 'Lindahl, Britton and colleagues catalogue meditation-related challenges, including pressure that builds and releases.', ref: 'lindahl2017' },
  { year: '2018', kind: 'anatomy', text: 'Benias and colleagues describe a body-wide, fluid-filled interstitium in the fasciae and dermis.', ref: 'benias2018' },
  { year: '2023', kind: 'essay', text: 'Michael Edward Johnson proposes vasocomputation: vascular tension as memory, latches as hyperpriors.', ref: 'johnson2023' },
  { year: '2026', kind: 'essay', text: 'Knots of Existence and Vasocomputation, then Knots of Existence Hypotheses: knots as perforators held stuck, and the fascia as a second system.', ref: 'jhong2026' },
];
