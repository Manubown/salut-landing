/**
 * Procedural 3D phone shared by the hero sequence and the scrub stages.
 * Built entirely from primitives (no GLB asset to download): a rounded-box
 * body with metallic clearcoat that picks up the environment, the shader
 * screen supplied by the caller, a "liquid glass" overlay catching a
 * pointer-driven light streak, and a camera island for the turn-around.
 */
import type { Group, Material, Mesh, ShaderMaterial, Texture, Vector2, WebGLRenderer } from 'three';
import { GLASS_FRAG, SCREEN_VERT } from './screen-shader';

type ThreeNS = typeof import('three');

/** Phone dimensions in world units (19.5:9 flagship proportions). */
export const PHONE = {
  W: 1,
  H: 2.16,
  D: 0.09,
  R: 0.12,
  SW: 0.94,
  SH: 2.08,
} as const;

export interface PhoneRig {
  group: Group;
  glassUniforms: {
    uTime: { value: number };
    uStreak: { value: Vector2 };
    /** 0 = reflections off (camera inside the screen) → 1 = full glass. */
    uReveal: { value: number };
  };
  dispose(): void;
}

/** Soft studio environment for the clearcoat reflections (procedural, no HDR). */
export async function makeEnvironment(THREE: ThreeNS, renderer: WebGLRenderer): Promise<Texture> {
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

export async function buildPhone(THREE: ThreeNS, screenMaterial: Material): Promise<PhoneRig> {
  const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  // body — dark glass-metal slab with clearcoat
  const body = new THREE.Mesh(
    track(new RoundedBoxGeometry(PHONE.W, PHONE.H, PHONE.D, 5, PHONE.R * 0.5)),
    track(
      new THREE.MeshPhysicalMaterial({
        color: 0x171022,
        metalness: 0.75,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.16,
        envMapIntensity: 1.3,
      }),
    ),
  );
  group.add(body);

  // screen — caller-supplied shader plane, slightly proud of the body
  const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(PHONE.SW, PHONE.SH)), screenMaterial);
  screen.position.z = PHONE.D / 2 + 0.0015;
  screen.renderOrder = 1;
  group.add(screen);

  // liquid-glass overlay — additive streak + edge sheen
  const glassUniforms = {
    uTime: { value: 0 },
    uStreak: { value: new THREE.Vector2(0, 0) },
    uReveal: { value: 1 },
  };
  const glassMat = track(
    new THREE.ShaderMaterial({
      uniforms: glassUniforms,
      vertexShader: SCREEN_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }) as ShaderMaterial,
  );
  const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(PHONE.SW, PHONE.SH)), glassMat);
  glass.position.z = PHONE.D / 2 + 0.004;
  glass.renderOrder = 2;
  group.add(glass);

  // camera island + lenses on the back (sells the turn-around)
  const isleMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x0e0a16,
      metalness: 0.6,
      roughness: 0.38,
      clearcoat: 0.9,
      clearcoatRoughness: 0.2,
    }),
  );
  const isle = new THREE.Mesh(track(new RoundedBoxGeometry(0.36, 0.36, 0.035, 3, 0.07)), isleMat);
  isle.position.set(-0.24, 0.8, -PHONE.D / 2 - 0.012);
  group.add(isle);

  const lensGeo = track(new THREE.CylinderGeometry(0.062, 0.062, 0.02, 24));
  const lensMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x05030a,
      metalness: 0.2,
      roughness: 0.1,
      clearcoat: 1,
    }),
  );
  for (const [lx, ly] of [
    [-0.31, 0.87],
    [-0.17, 0.73],
  ]) {
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(lx, ly, -PHONE.D / 2 - 0.028);
    group.add(lens);
  }

  return {
    group,
    glassUniforms,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

// ── tiny easing/range helpers shared by the stage components ───────────────

export function remap(v: number, a: number, b: number): number {
  return Math.min(1, Math.max(0, (v - a) / (b - a)));
}

export function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
