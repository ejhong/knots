# The simulation section — design

*The site's side of the field guide. The research plan is `sim/PLAN.md`; the look is `docs/DESIGN.md`. The field guide
lives in the Hypotheses page (`/hypotheses/`): each theory's account and what its model shows, side by side, with the
instrument at the top; `/simulation/` redirects there, and `/simulation/vessel/` is one perforator up close. Research
(`/research/`) is the case for researchers: what physics allows, where the theories part, and the measurement that would
decide. The exam-era design is in `sim/archive/`.*

The atlas shows what each theory says a knot *is*. The field guide shows how its knots would *behave*: each theory, run
from its own physiology, grows its knots in the same patch of body and meets the same scenes; it shows how they would feel
under a hand, respond, let go and move, and what an instrument would record. Nothing in it is fitted to anyone's reports.

## Principles

On top of `docs/DESIGN.md` and `CLAUDE.md`.

- **The model shows itself.** Every animated thing is driven by a model's state from a run; nothing is hand-animated. Where
  time is compressed the clock says so. A theory with nothing to feel shows nothing, and says so.
- **Fair.** The theories appear in the site's order with their characters and short labels (結 Perforators, 閂 Vascular
  latch, 点 Trigger points, 膠 Densification, 神経 Nerves, 覚 Perception, 握 Motor switch). The same patch, stress field,
  scenes, hand and breath for each. No theory has a colour of its own; nothing is coloured as good or bad.
- **Traceable.** A trait names what it rests on (sourced, or guessed) and the run it came from; the method links to the
  parameters and their quotes.
- **Describe, never prescribe.** *Scenes* happen to a model; they are not instructions. The moderation guidance is on the
  page. No technique, no intensity.
- **Colour roles hold.** Terracotta is a held knot and nothing else. Jade is release and the spark. Bronze is the hand. The
  indigo seal marks what is dated. Silver-blue is vessels; stone is structure; everything else is ink and paper.
- **Fast.** The page imports one small index (`src/data/sim/guide.json`) and fetches one file per scene as it is chosen
  (`public/sim/guide/<scene>.json`). Canvas for the patches, hand-made SVG for the plates and traces; no libraries, no web
  fonts.
- **Paced by the breath**, and still under `prefers-reduced-motion` (the scene opens paused, on its most telling frame).

## The Hypotheses page, top to bottom

A reading page (the paper card with its quiet index), with one ink-stone instrument set into it. Merged 28 Sep 2026: a
theory's account and its model's behaviour belong together, and one page is simpler to use than two.

1. **Opening.** "What is a knot?": seven answers, each at its strongest; five run as models; the index.
2. **Watch them** (`#watch`, ink stone, full width).
   - *Scenes*: a row of chips, one per scene (`sim/PLAN.md` §6), each with its duration.
   - *Side by side*: the modelled theories' patches in a row (two by two on a phone), each with its character, label, how
     many are held, and a live caption narrated from the run. Tapping one opens it up close.
   - *The timeline*: the breath as a wave, stress as a band, the hand and attention as marks; a scrubber; play and pause.
     The clock shows model time and how much it is compressed.
   - *Up close*, the chosen theory: its patch large; **beneath**, the cross-section of the knot at the spot; **on the
     instruments**, strip charts of what a recording would show at the spot and at the sham.
3. **The seven theories**, in the site's order, each a section with a "watch it" button (chooses it in the instrument and
   scrolls there) and its atlas link. Two columns (one on a phone):
   - *What it says*: the cross-section, the account in its strongest form, where / made of / holds / releases / timescale /
     breath / travel, its evidence and its sharpest test, its references.
   - *What its model shows*: the switch (what holds a knot: the theory's own drive along the bottom, how held up the side,
     the band where both states are stable, where rest and the holding stress put the typical knot), then the key traits
     with their marks (● every setting, ◐ some, and what it depends on, ○ none, — silent), and the full portrait folded
     beneath. All seven are modelled.
4. **How they differ** (`#differ`): the traits as a table across the modelled theories; then what a breath would have to do
   (the envelope chart).
5. **How it is made**: the patch, the senses, the settings, the scaling rule, the sources; the moderation note.

## The patch, drawn

On ink stone, seen from above, 4 cm square; fibres of the muscle beneath as the faintest striations (where the theory has
muscle); stress held as a barely warmer wash toward the neck side. Each theory's units as its anatomy has them:

- **Perforators**: small ivory points every 4–5 mm, a ring for each parent, faint silver-blue lines from parent to children.
  A held knot is a terracotta ember at its ring, with a soft warm halo over the patch it starves (tenderness). A release is
  a jade star over its patch: the nerve's burst as blood returns.
- **Trigger points**: a few beads along the zone where the nerve enters the muscle, each on a thin taut band along the
  fibres. A knot is a terracotta bead with its band drawn taut; a release softens it; a twitch runs along the band in jade.
- **Perception**: no units in the tissue; soft places at the body map's resolution. A knot is a broad terracotta glow with
  no core, brighter as it is felt; attention is a thin jade ring.
- **Densification**: the gliding layer as the faintest loose strokes; where it slides, short strokes drift; a stuck
  region is a broad terracotta wash joined with its stuck neighbours, still; giving way, it fades as the strokes drift
  again.
- **Nerves**: a few fixed points, each a small ring (where the nerve pierces the fascia) with a vessel dot beside it and
  the nerve's branches fanning through the skin. A felt knot is a terracotta point with its ache around it; pressed past
  a level, jade dots run out along the branches (the tingle).
- **Vascular latch**: small arteries 5 mm apart as faint points. A clamped region darkens (less blood), and a held one is a
  dim terracotta core: dull until attention or a hand reaches it, then tender. Letting go is slow: the region warms back
  over tens of seconds, a jade wash rather than a star.
- **Motor switch**: faint ellipses along the fibres, one per motor unit's territory. A latched unit glows terracotta through
  its territory, flickering faintly at its firing rate; overlapping territories add into a firmer bump. Letting go is at
  once: the glow falls and a jade outline passes.

The hand is a bronze disc (pressing: its rim brightens); the roller a bronze bar; the sham a small stone ring.

**Beneath** (SVG, one per theory): skin, fat, the superficial and deep fascia, muscle, as in the introduction's plate.
Perforators: the artery rising through its ring, its lumen from the run. Trigger points: the band and its contraction knot,
its capillaries squeezed. Motor switch: the muscle with one unit's scattered fibres lit, and to one side a small cross-section
of the spinal cord with the motor neuron, its inputs (descending drive, inhibition, the loop from the muscle's sensors) and
its latch. Perception: the tissue quiet, and a small body map with its gain.

## Data contracts: sim → site

All written by `uv run python -m knots_sim.guide`, never by hand; each file carries its run (inputs hash, commit, date).

| File | Contents |
|---|---|
| `src/data/sim/guide.json` | the run; the patch (size, stress field, spot, sham); the scenes (id, name, what happens, duration, frame step, compression); per theory: id, character, label, variants, its units' layout (positions, sizes, kinds, links), and its character (traits by group: id, text, mark, share, depends-on) |
| `public/sim/guide/<scene>.json` | per theory, the typical setting's run of that scene: frame times; per unit per frame the held state, the felt bump and tenderness (quantised to bytes, base64); events (forms, releases, sparks, twitches: unit, time, size); the knot at the spot's internal state per frame (for the plate); the instruments at the spot and the sham per frame; the inputs per frame (stress, breath, hand, attention) |
| `sim/findings/guide.md` | the characters as a note, generated with the data |

## Visual specifics

- **Type.** Headings in sans (15px, 700); prose in Georgia (13.5px on paper); data, axes, labels and captions of the
  instrument in SF Mono (9–11px); the narrated caption in Georgia italic.
- **Lines.** 1px ink axes; direct labels instead of legends; no gridlines.
- **Tokens.** From `src/styles/tokens.css`: `--terracotta` held, `--sage`/`--jade-light` release, `--seal`, `--stone`,
  `--muted`. On ink the night palette the atlas uses (terracotta `#e27b61`, spark `#a8e6cd`, vessels `#b3c4d2`). A new
  colour goes into `tokens.css` and `engine/theme.ts` together.
- **Numbers** with units; two significant figures; ranges written 0.8–2.4.
- **Accessibility.** Each patch has a text summary that follows the caption; the character is a real list with its marks
  also in words; controls are keyboard-reachable and labelled; reduced motion shows a still frame.
