import { DoubleSide, Ray, Raycaster, Vector2, Vector3, type Camera } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { BufferGeometry } from 'three';

export interface SurfaceHit {
  point: Vector3;
  normal: Vector3;
  tri: number;
  distance: number;
}

/**
 * Ray picking against the live figure. The BVH is `indirect` so the mesh's
 * triangle order (which anchors depend on) is never rearranged, and it is
 * refit — not rebuilt — when the figure changes shape.
 */
export class Picker {
  private bvh: MeshBVH;
  private raycaster = new Raycaster();
  private ndc = new Vector2();
  private ray = new Ray();

  constructor(
    private geometry: BufferGeometry,
    private normals: Float32Array,
    private triangles: Uint32Array,
  ) {
    this.bvh = new MeshBVH(geometry, { indirect: true });
  }

  refit() {
    this.bvh.refit();
  }

  /** Ray from a canvas-relative pointer position. */
  pick(x: number, y: number, width: number, height: number, camera: Camera): SurfaceHit | null {
    this.ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, camera);
    this.ray.copy(this.raycaster.ray);
    return this.cast(this.ray);
  }

  cast(ray: Ray): SurfaceHit | null {
    const hit = this.bvh.raycastFirst(ray, DoubleSide);
    if (!hit || hit.faceIndex == null) return null;
    const t = hit.faceIndex * 3;
    const n = new Vector3();
    for (let k = 0; k < 3; k++) {
      const v = this.triangles[t + k] * 3;
      n.x += this.normals[v];
      n.y += this.normals[v + 1];
      n.z += this.normals[v + 2];
    }
    n.normalize();
    return { point: hit.point.clone(), normal: n, tri: hit.faceIndex, distance: hit.distance };
  }

  /** True if the segment from `from` to `to` is blocked by the body. */
  occluded(from: Vector3, to: Vector3, slack = 0.01): boolean {
    const dir = to.clone().sub(from);
    const len = dir.length();
    this.ray.set(from, dir.normalize());
    const hit = this.bvh.raycastFirst(this.ray, DoubleSide);
    return !!hit && hit.distance < len - slack;
  }
}
