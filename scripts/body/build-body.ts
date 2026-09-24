/**
 * Builds public/models/body.{json,bin} from the MakeHuman hm08 base mesh (CC0).
 *
 * The output is a compact, fixed-topology quad mesh plus eight morph states
 * (female|male × baby|child|young|old), each averaged over MakeHuman's three
 * ethnic macro targets. Joint landmarks (centroids of the base mesh's
 * `joint-*` helper groups) are stored for the base and for every state, so
 * the viewer can derive a skeleton at any age without rigging.
 *
 * Run with `npm run body`. Downloads are cached in scripts/body/.cache.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, '.cache');
const outDir = join(here, '../../public/models');
const RAW = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data';

const SEXES = ['female', 'male'] as const;
const AGES = ['baby', 'child', 'young', 'old'] as const;
const RACES = ['african', 'asian', 'caucasian'] as const;
/** MakeHuman scene units are decimetres. */
const SCALE = 0.1;

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function cached(rel: string): Promise<string> {
  const local = join(cacheDir, rel.replaceAll('/', '__'));
  if (!(await exists(local))) {
    const res = await fetch(`${RAW}/${rel}`);
    if (!res.ok) throw new Error(`download failed ${rel}: ${res.status}`);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(local, await res.text());
    console.log('  fetched', rel);
  }
  return readFile(local, 'utf8');
}

interface Obj {
  verts: Float64Array;
  groups: Map<string, number[][]>;
}

function parseObj(src: string): Obj {
  const v: number[] = [];
  const groups = new Map<string, number[][]>();
  let cur = 'default';
  for (const line of src.split('\n')) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/);
      v.push(+x, +y, +z);
    } else if (line.startsWith('g ')) {
      cur = line.trim().split(/\s+/)[1];
    } else if (line.startsWith('f ')) {
      const idx = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => parseInt(t.split('/')[0], 10) - 1);
      if (!groups.has(cur)) groups.set(cur, []);
      groups.get(cur)!.push(idx);
    }
  }
  return { verts: Float64Array.from(v), groups };
}

function parseTarget(src: string, n: number): Float64Array {
  const d = new Float64Array(n * 3);
  for (const line of src.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [i, x, y, z] = line.trim().split(/\s+/);
    const k = +i * 3;
    d[k] = +x;
    d[k + 1] = +y;
    d[k + 2] = +z;
  }
  return d;
}

async function main() {
  console.log('building body from MakeHuman hm08 (CC0)…');
  const obj = parseObj(await cached('3dobjs/base.obj'));
  const nAll = obj.verts.length / 3;

  const bodyFaces = obj.groups.get('body');
  if (!bodyFaces) throw new Error('no body group');
  if (bodyFaces.some((f) => f.length !== 4)) throw new Error('expected an all-quad body');

  // Compact the body vertices.
  const remap = new Int32Array(nAll).fill(-1);
  const order: number[] = [];
  for (const f of bodyFaces)
    for (const i of f)
      if (remap[i] < 0) {
        remap[i] = order.length;
        order.push(i);
      }
  const V = order.length;
  const F = bodyFaces.length;
  if (V > 65535) throw new Error('too many vertices for uint16');

  const quads = new Uint16Array(F * 4);
  bodyFaces.forEach((f, q) => f.forEach((i, k) => (quads[q * 4 + k] = remap[i])));

  const base = new Float32Array(V * 3);
  order.forEach((src, dst) => {
    for (let k = 0; k < 3; k++) base[dst * 3 + k] = obj.verts[src * 3 + k] * SCALE;
  });

  // Joint landmarks: centroid of each joint-* helper group (all-vertex indices).
  const jointNames = [...obj.groups.keys()].filter((g) => g.startsWith('joint-')).sort();
  const jointVerts = jointNames.map((g) => [...new Set(obj.groups.get(g)!.flat())]);
  const centroid = (arr: Float64Array, verts: number[], scale = 1) => {
    const c = [0, 0, 0];
    for (const i of verts) for (let k = 0; k < 3; k++) c[k] += arr[i * 3 + k];
    return c.map((x) => (x / verts.length) * scale);
  };
  const jointsBase = jointNames.flatMap((_, j) => centroid(obj.verts, jointVerts[j], SCALE));

  // Morph states, averaged over the three ethnic macro targets.
  const states: string[] = [];
  const deltaScale: number[] = [];
  const deltas: Int16Array[] = [];
  const jointsByState: number[][] = [];
  for (const sex of SEXES)
    for (const age of AGES) {
      const avg = new Float64Array(nAll * 3);
      for (const race of RACES) {
        const t = parseTarget(await cached(`targets/macrodetails/${race}-${sex}-${age}.target`), nAll);
        for (let i = 0; i < avg.length; i++) avg[i] += t[i] / RACES.length;
      }
      let max = 0;
      for (const src of order) for (let k = 0; k < 3; k++) max = Math.max(max, Math.abs(avg[src * 3 + k]));
      const q = (max * SCALE) / 32767 || 1;
      const d = new Int16Array(V * 3);
      order.forEach((src, dst) => {
        for (let k = 0; k < 3; k++) d[dst * 3 + k] = Math.round((avg[src * 3 + k] * SCALE) / q);
      });
      states.push(`${sex}-${age}`);
      deltaScale.push(q);
      deltas.push(d);
      // Joint positions for this state (absolute, metres).
      const shifted = Float64Array.from(obj.verts, (x, i) => x + avg[i]);
      jointsByState.push(jointNames.flatMap((_, j) => centroid(shifted, jointVerts[j], SCALE)));
      console.log(`  state ${sex}-${age}: max |Δ| = ${(max * SCALE).toFixed(3)} m`);
    }

  // Pack binary: base positions | quads | deltas (8 states).
  const parts: ArrayBufferView[] = [base, quads, ...deltas];
  const layout: Record<string, { offset: number; length: number; type: string }> = {};
  let offset = 0;
  const names = ['positions', 'quads', ...states.map((s) => `delta:${s}`)];
  parts.forEach((p, i) => {
    // 4-byte alignment for typed-array views.
    offset = Math.ceil(offset / 4) * 4;
    layout[names[i]] = {
      offset,
      length: (p as Float32Array).length,
      type: p.constructor.name,
    };
    offset += p.byteLength;
  });
  const bin = new Uint8Array(offset);
  parts.forEach((p, i) => bin.set(new Uint8Array(p.buffer, p.byteOffset, p.byteLength), layout[names[i]].offset));

  const round = (a: number[]) => a.map((x) => Math.round(x * 1e5) / 1e5);
  const meta = {
    version: 1,
    source: 'MakeHuman hm08 base mesh and macro targets, CC0 1.0 (makehumancommunity.org)',
    units: 'm',
    up: 'y',
    front: '+z',
    vertexCount: V,
    quadCount: F,
    states,
    deltaScale,
    ageAnchors: { baby: 1, child: 11, young: 25, old: 90 },
    joints: {
      names: jointNames.map((n) => n.replace(/^joint-/, '')),
      base: round(jointsBase),
      states: Object.fromEntries(states.map((s, i) => [s, round(jointsByState[i])])),
    },
    layout,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'body.bin'), bin);
  await writeFile(join(outDir, 'body.json'), JSON.stringify(meta));
  console.log(`wrote body.bin (${(bin.byteLength / 1024).toFixed(0)} KB), ${V} verts, ${F} quads, ${jointNames.length} joints`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
