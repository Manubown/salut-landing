/**
 * GLSL for the 3D phone's display.
 *
 * The screen is a single shader plane: a procedural party scene (venue haze,
 * sweeping light beams in brand colours, a bobbing crowd silhouette, strobe
 * dust) crossfaded via an iris "app launch" wipe into the app-UI canvas
 * texture. Because the party scene is evaluated per *output* pixel, it stays
 * razor sharp even when the camera sits so close that the screen fills the
 * whole viewport — no render-target resolution limit.
 *
 * The liquid-glass overlay is a second, additive plane: a pointer-driven
 * specular streak plus an edge sheen, masked to the screen's rounded corners.
 */
import type { CanvasTexture, ShaderMaterial, Vector2 } from 'three';

/** Screen plane aspect (world units, matches PHONE.SW / PHONE.SH). */
export const SCREEN_ASPECT = 0.94 / 2.08;

const ROUNDED_MASK = /* glsl */ `
float screenMask(vec2 uv) {
  // rounded-rect SDF in screen space (x scaled by aspect)
  vec2 p = (uv - 0.5) * vec2(${SCREEN_ASPECT.toFixed(5)}, 1.0);
  vec2 b = vec2(${SCREEN_ASPECT.toFixed(5)}, 1.0) * 0.5 - 0.045;
  vec2 d = abs(p) - b;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.045;
  return smoothstep(0.0035, -0.0035, dist);
}
`;

export const SCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SCREEN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uMix;     // 0 = party scene → 1 = app UI
uniform vec2 uPointer;  // -1..1, subtle parallax on the light rig
uniform sampler2D uApp; // canvas-painted Salut UI

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.15; a *= 0.5; }
  return v;
}

vec3 beamColor(float i) {
  // punch / grape / citrus / ice-blue
  if (i < 0.5) return vec3(1.0, 0.18, 0.39);
  if (i < 1.5) return vec3(0.46, 0.20, 0.90);
  if (i < 2.5) return vec3(1.0, 0.82, 0.25);
  return vec3(0.34, 0.80, 0.95);
}

vec3 party(vec2 uv) {
  float t = uTime;
  float beat = 0.5 + 0.5 * sin(t * 3.4); // ~130 bpm pulse

  // venue backdrop + haze
  vec3 col = mix(vec3(0.020, 0.012, 0.05), vec3(0.085, 0.05, 0.19), pow(1.0 - uv.y, 1.7));
  col += vec3(0.05, 0.03, 0.10) * fbm(uv * 3.0 + vec2(t * 0.05, -t * 0.02));

  // sweeping beams from the rig above the frame
  vec2 rig = vec2(0.5 + uPointer.x * 0.05, 1.10);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float ang = -0.62 + 0.31 * fi + 0.38 * sin(t * (0.5 + fi * 0.13) + fi * 1.7);
    vec2 dir = normalize(vec2(sin(ang), -1.0));
    vec2 rel = uv - rig;
    float along = dot(rel, dir);
    float perp = abs(rel.x * dir.y - rel.y * dir.x);
    float beam = exp(-perp * perp * 240.0) * smoothstep(0.0, 0.3, along);
    beam *= 0.45 + 0.55 * beat;
    col += beamColor(mod(fi + floor(t * 0.4), 4.0)) * beam * 0.55;
  }

  // strobe dust drifting in the lights
  vec2 g = uv * vec2(26.0, 42.0) + vec2(0.0, t * 0.7);
  float sp = step(0.986, hash(floor(g))) * smoothstep(0.45, 0.0, length(fract(g) - 0.5));
  col += vec3(1.0) * sp * 0.55;

  // crowd silhouette — heads bobbing on the beat, a few raised hands
  float x = uv.x;
  float crowd = 0.17
    + 0.045 * sin(x * 21.0 + 1.7)
    + 0.04  * sin(x * 47.0 + t * 0.6)
    + 0.05  * noise(vec2(x * 9.0, 2.0))
    + 0.018 * sin(t * 3.4 + x * 12.0) * (0.5 + 0.5 * sin(x * 5.0));
  float cells = 34.0;
  float cell = floor(x * cells);
  float ctr = (cell + 0.5) / cells;
  float hand = step(0.88, hash(vec2(cell, 3.0)));
  float bounce = 0.5 + 0.5 * sin(t * 3.4 + hash(vec2(cell, 9.0)) * 6.28);
  crowd += hand * exp(-pow((x - ctr) * cells * 3.2, 2.0)) * (0.05 + 0.05 * bounce);
  float sil = smoothstep(crowd + 0.006, crowd - 0.006, uv.y);
  col = mix(col, vec3(0.012, 0.008, 0.028), sil);

  // vignette
  col *= 1.0 - 0.38 * length(uv - vec2(0.5, 0.45));
  return col;
}

${ROUNDED_MASK}

void main() {
  float mask = screenMask(vUv);
  if (mask <= 0.0) discard;

  vec3 col = party(vUv);
  if (uMix > 0.001) {
    // iris "app launch" wipe blooming from the dock (1 inside the circle)
    vec2 auv = (vUv - 0.5) / mix(1.05, 1.0, uMix) + 0.5;
    vec3 app = texture2D(uApp, clamp(auv, 0.0, 1.0)).rgb;
    float r = uMix * 1.9;
    float d = distance(vUv * vec2(${SCREEN_ASPECT.toFixed(5)}, 1.0),
                       vec2(0.5 * ${SCREEN_ASPECT.toFixed(5)}, 0.92));
    float iris = 1.0 - smoothstep(r - 0.22, r, d);
    col = mix(col, app, iris);
  }

  gl_FragColor = vec4(col, mask);
}
`;

export const GLASS_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uStreak;  // pointer -1..1 steers the specular streak
uniform float uReveal; // 0 = no reflections (camera inside the screen) → 1 = full glass

${ROUNDED_MASK}

void main() {
  float mask = screenMask(vUv);
  if (mask <= 0.0) discard;

  vec2 p = vUv - 0.5;
  // primary diagonal streak follows the pointer; secondary trails behind
  float band = p.x * 1.5 - p.y * 0.85 + uStreak.x * 0.55 - uStreak.y * 0.3;
  float streak = exp(-band * band * 16.0) * 0.14;
  streak += exp(-pow(band - 0.42, 2.0) * 55.0) * 0.07;
  // slow ambient sweep so the glass is alive even without a pointer
  float amb = exp(-pow(p.y - sin(uTime * 0.25) * 0.45, 2.0) * 9.0) * 0.04;
  // edge sheen near the rounded border
  float edge = smoothstep(0.42, 0.5, max(abs(p.x) * 2.1, abs(p.y))) * 0.09;

  gl_FragColor = vec4(vec3(1.0), (streak + amb + edge) * mask * uReveal);
}
`;

export interface ScreenUniforms {
  uTime: { value: number };
  uMix: { value: number };
  uPointer: { value: Vector2 };
  uApp: { value: CanvasTexture };
  [key: string]: { value: unknown };
}

/** Shader material for the phone screen (party ⇄ app UI). */
export function makeScreenMaterial(
  THREE: typeof import('three'),
  appTexture: CanvasTexture,
): { material: ShaderMaterial; uniforms: ScreenUniforms } {
  const uniforms: ScreenUniforms = {
    uTime: { value: 0 },
    uMix: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uApp: { value: appTexture },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SCREEN_VERT,
    fragmentShader: SCREEN_FRAG,
    transparent: true,
  });
  return { material, uniforms };
}
