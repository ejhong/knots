# Data formats

## Locators (placing anything on the body)

Axes are figure-relative: **+x is the figure's left**, +y up, +z front; metres on the reference adult (age 30, sex 0.5).

```ts
{ ray: { j: 'head', o: [0.028, 0.035, 0] }, dir: [0.32, 0.1, -1] }   // from a skeletal point, out through the skin
{ near: { lerp: ['l-elbow', 'l-hand', 0.25] }, dir: [0, 0, 1] }        // closest skin point, facing dir
```

Point expressions: `'neck'`, `{ j, o }`, `{ lerp: [a, b, t], o }`, `{ mid: [a, b], o }`. Joint names come from MakeHuman's
`joint-*` helper groups (see `public/models/body.json → joints.names`): `head`, `head-2` (crown), `neck`, `spine-1..4`, `pelvis`,
`l-/r-clavicle, scapula, shoulder, elbow, hand, upper-leg, knee, ankle, foot-1, foot-2, eye`, `jaw`, `mouth`, fingers and toes.
Write the left side; set `bilateral: true` to mirror.

## Hypotheses — `src/data/hypotheses.ts`

One object per hypothesis with the comparison fields (`layer, substance, holds, releases, timescale, breath, travel, age, test,
status`), `body` paragraphs, `refs` (keys into the library) and `ready` (implemented in the atlas).

## References — `src/data/references.ts` and `papers.json`

Papers come from PubMed E-utilities (esummary) — authors, title, venue, DOI — never typed from memory. Each needs a one-sentence
`note` saying why it matters and at least one `tag`. Books, classical texts and web sources are hand-entered in `references.ts`.

## Maps — `src/data/mapIndex.ts` (+ `src/viewer/maps/`, planned)

Each map: `id`, `name`, `color` (a CSS token), `ready`. Map geometry will live in `src/viewer/maps/<id>.ts` as named points and
paths written with locators; acupoints use proportional cun measured from landmarks.
