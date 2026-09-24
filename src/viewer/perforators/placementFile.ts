import { PLACEMENT_VERSION, type LadderParams, type LadderPlacement } from './generate';

/**
 * The precomputed perforator placement, as shipped in public/models/ladder.bin:
 *
 *   header  8 × uint32: magic 'KNLP', format version, key, count, nMaj, nMed, 0, 0
 *   tri     uint32 × count      triangle of each perforator
 *   uv      uint16 × 2·count    barycentric (u, v), quantised to 1/65535
 *
 * `key` fingerprints everything the placement depends on — the generator's
 * version, the ladder parameters and the body's source files — so a stale
 * file is never used: the viewer computes the placement instead.
 */
const MAGIC = 0x504c4e4b; // 'KNLP'
const FORMAT = 1;
const HEADER = 8;

/** FNV-1a over bytes, continued from `h`. */
export function fnv1a(bytes: Uint8Array, h = 0x811c9dc5): number {
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The fingerprint of a placement's inputs: generator version, parameters, and the body's files. */
export function placementKey(params: LadderParams, bodySource: number): number {
  const text = new TextEncoder().encode(`${PLACEMENT_VERSION}:${params.seed}:${params.total}:${params.major}:${params.medium}:${bodySource}`);
  return fnv1a(text);
}

/** A fingerprint of the body's source files (body.json text and body.bin bytes). */
export function bodySourceKey(jsonText: string, bin: ArrayBuffer): number {
  return fnv1a(new Uint8Array(bin), fnv1a(new TextEncoder().encode(jsonText)));
}

export function encodePlacement(p: LadderPlacement, key: number): ArrayBuffer {
  const n = p.tri.length;
  const buf = new ArrayBuffer(HEADER * 4 + n * 4 + n * 4);
  new Uint32Array(buf, 0, HEADER).set([MAGIC, FORMAT, key, n, p.nMaj, p.nMed, 0, 0]);
  new Uint32Array(buf, HEADER * 4, n).set(p.tri);
  const uv = new Uint16Array(buf, HEADER * 4 + n * 4, n * 2);
  for (let i = 0; i < n * 2; i++) uv[i] = Math.round(Math.min(1, Math.max(0, p.uv[i])) * 65535);
  return buf;
}

/** The placement in a file, or null if the file is not one, or was made from other inputs. */
export function decodePlacement(buf: ArrayBuffer, key: number): LadderPlacement | null {
  if (buf.byteLength < HEADER * 4) return null;
  const h = new Uint32Array(buf, 0, HEADER);
  if (h[0] !== MAGIC || h[1] !== FORMAT || h[2] !== key) return null;
  const n = h[3];
  if (buf.byteLength !== HEADER * 4 + n * 8) return null;
  const tri = new Uint32Array(buf, HEADER * 4, n).slice();
  const q = new Uint16Array(buf, HEADER * 4 + n * 4, n * 2);
  const uv = Float32Array.from(q, (x) => x / 65535);
  return { tri, uv, nMaj: h[4], nMed: h[5] };
}
