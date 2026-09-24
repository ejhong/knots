import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  NormalBlending,
  ShaderMaterial,
} from 'three';
import type { BodyModel } from '../body/BodyModel';
import type { SceneTheme } from '../engine/theme';
import type { Ladder } from './generate';

/**
 * The trees: source trunks (root → major perforator) and branches
 * (major → medium), drawn as hairlines along the skin. Line weight follows
 * flow, so trunks read heavier near their roots — the way a river network
 * thickens toward the sea. A pulse can run along any path toward its root:
 * conducted vasodilation climbing the tree.
 */
export class TreeLines {
  readonly lines: LineSegments;
  readonly geometry = new BufferGeometry();
  readonly material: ShaderMaterial;
  private pos: Float32Array;
  private nrm: Float32Array;
  private posAttr: BufferAttribute;
  /** Per-edge-vertex highlight (0..1), e.g. a travelling release pulse. */
  readonly pulse: Float32Array;
  private pulseAttr: BufferAttribute;
  /** Map from fine vertex → edge-vertex slots touching it (for pulses). */
  readonly edgeOfVertex: Map<number, number[]> = new Map();

  constructor(readonly ladder: Ladder) {
    const E = ladder.treeEdges.length / 2;
    this.pos = new Float32Array(E * 2 * 3);
    this.nrm = new Float32Array(E * 2 * 3);
    const flow = new Float32Array(E * 2);
    const level = new Float32Array(E * 2);
    const arc = new Float32Array(E * 2);
    this.pulse = new Float32Array(E * 2);
    let maxFlow = 1;
    for (let e = 0; e < E; e++) maxFlow = Math.max(maxFlow, ladder.treeFlow[e]);
    for (let e = 0; e < E; e++) {
      const f = Math.log(1 + ladder.treeFlow[e]) / Math.log(1 + maxFlow);
      flow[e * 2] = flow[e * 2 + 1] = f;
      level[e * 2] = level[e * 2 + 1] = ladder.treeLevel[e];
      for (const k of [0, 1]) {
        const v = ladder.treeEdges[e * 2 + k];
        if (ladder.treeLevel[e] >= 2) arc[e * 2 + k] = ladder.trunkDist[v];
        else {
          const major = ladder.branchLabel[v];
          const mv = major >= 0 ? ladder.vertex[major] : v;
          arc[e * 2 + k] = ladder.branchDist[v] + ladder.trunkDist[mv];
        }
        const slot = e * 2 + k;
        const list = this.edgeOfVertex.get(v);
        if (list) list.push(slot);
        else this.edgeOfVertex.set(v, [slot]);
      }
    }
    this.posAttr = new BufferAttribute(this.pos, 3);
    this.pulseAttr = new BufferAttribute(this.pulse, 1);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('normal', new BufferAttribute(this.nrm, 3));
    this.geometry.setAttribute('aFlow', new BufferAttribute(flow, 1));
    this.geometry.setAttribute('aLevel', new BufferAttribute(level, 1));
    this.geometry.setAttribute('aPulse', this.pulseAttr);
    this.geometry.setAttribute('aArc', new BufferAttribute(arc, 1));
    this.material = createTreeMaterial();
    this.lines = new LineSegments(this.geometry, this.material);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 1;
  }

  refresh(body: BodyModel) {
    const P = body.positions;
    const N = body.normals;
    const edges = this.ladder.treeEdges;
    for (let i = 0; i < edges.length; i++) {
      const v = edges[i] * 3;
      for (let k = 0; k < 3; k++) {
        this.pos[i * 3 + k] = P[v + k];
        this.nrm[i * 3 + k] = N[v + k];
      }
    }
    this.posAttr.needsUpdate = true;
    (this.geometry.getAttribute('normal') as BufferAttribute).needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  markPulseDirty() {
    this.pulseAttr.needsUpdate = true;
  }

  applyTheme(t: SceneTheme) {
    this.material.uniforms.uColor.value.copy(t.tree);
    this.material.uniforms.uPulseColor.value.copy(t.star);
    this.material.uniforms.uGlowMode.value = t.glow;
    this.material.blending = t.glow ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
  }
}

function createTreeMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uColor: { value: new Color() },
      uPulseColor: { value: new Color() },
      uAlpha: { value: 0.34 },
      uOffset: { value: 0.0006 },
      uLift: { value: 0 },
      uGlowMode: { value: 1 },
      uBranchAlpha: { value: 0.45 },
      uTime: { value: 0 },
      uFlow: { value: 0.45 },
    },
    vertexShader: /* glsl */ `
      attribute float aFlow;
      attribute float aLevel;
      attribute float aPulse;
      attribute float aArc;
      uniform float uOffset;
      varying float vArc;
      varying float vFlow;
      varying float vLevel;
      varying float vPulse;
      void main() {
        vec3 p = position + normalize(normal) * uOffset;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        vFlow = aFlow;
        vLevel = aLevel;
        vPulse = aPulse;
        vArc = aArc;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uPulseColor;
      uniform float uAlpha;
      uniform float uGlowMode;
      uniform float uBranchAlpha;
      uniform float uTime;
      uniform float uFlow;
      varying float vArc;
      varying float vFlow;
      varying float vLevel;
      varying float vPulse;
      void main() {
        float a = uAlpha * (vLevel > 1.5 ? mix(0.35, 1.0, vFlow) : uBranchAlpha * mix(0.4, 0.8, vFlow));
        // Light drifting up the tree toward the root (arc length decreases).
        float wave = fract(vArc * 9.0 + uTime * 0.11);
        float bead = smoothstep(0.86, 1.0, wave) * uFlow * (vLevel > 1.5 ? 1.0 : 0.6);
        vec3 col = mix(uColor, uPulseColor, clamp(vPulse + bead * 0.5, 0.0, 1.0));
        a = max(a * (1.0 + bead * 1.6), vPulse * 0.95);
        if (uGlowMode > 0.5) gl_FragColor = vec4(col * a, 1.0);
        else gl_FragColor = vec4(col, a);
      }
    `,
  });
}
