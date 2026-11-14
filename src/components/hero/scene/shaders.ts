/** GLSL shared by the coffee surface, the pour stream and the steam. */

export const NOISE_GLSL = /* glsl */ `
float mmHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float mmNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mmHash(i), mmHash(i + vec2(1.0, 0.0)), u.x),
    mix(mmHash(i + vec2(0.0, 1.0)), mmHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float mmFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * mmNoise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}
// Distance to the nearest cell point: used for crema micro-bubbles.
float mmCells(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(mmHash(i + g), mmHash(i + g + 17.3));
      d = min(d, length(g + o - f));
    }
  }
  return d;
}
`;

/** Large-scale surface waves, evaluated in both vertex (displacement) and fragment (shading). */
export const WAVES_GLSL = /* glsl */ `
uniform float uTime;
uniform float uAgitation;
uniform float uPour;
uniform vec2 uPourPos;

float mmWaves(vec2 p) {
  float t = uTime;
  float w = sin(dot(p, vec2(5.1, 2.3)) + t * 5.2) * 0.5
          + sin(dot(p, vec2(-3.7, 6.1)) - t * 4.1) * 0.35
          + sin(dot(p, vec2(8.3, -7.2)) + t * 7.3) * 0.15;
  float d = length(p - uPourPos);
  float ripple = sin(d * 26.0 - t * 15.0) * exp(-d * 3.2);
  return w * uAgitation + ripple * uPour * 0.9;
}
`;

export const LIQUID_VERTEX_PARS = /* glsl */ `
varying vec2 vDisc;
${WAVES_GLSL}
`;

export const LIQUID_VERTEX_MAIN = /* glsl */ `
vDisc = position.xz;
{
  // Pin the edge so the surface never separates from the cup wall.
  float edge = 1.0 - smoothstep(0.72, 1.0, length(position.xz));
  transformed.y += mmWaves(position.xz) * 0.022 * edge;
}
`;

export const LIQUID_FRAGMENT_PARS = /* glsl */ `
varying vec2 vDisc;
uniform float uFill;
uniform float uSwirl;
${NOISE_GLSL}
${WAVES_GLSL}

vec2 mmRotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
`;

/** Runs right after <color_fragment>: computes crema colour, roughness and a height field. */
export const LIQUID_FRAGMENT_COLOR = /* glsl */ `
float mmR = length(vDisc);
// Differential rotation: the centre has turned further than the rim, like stirred coffee.
vec2 mmQ = mmRotate(vDisc, uSwirl * (1.35 - mmR) + uTime * 0.015);
float mmWarp = mmFbm(mmQ * 2.1 + vec2(0.0, uTime * 0.02));
float mmN = mmFbm(mmQ * 3.2 + vec2(mmWarp * 2.2, -mmWarp * 1.7) + 3.7);
float mmFine = mmFbm(mmRotate(mmQ, mmWarp * 1.5) * vec2(13.0, 5.0) + 9.1);

float mmPourD = length(vDisc - uPourPos);
float mmSplash = uPour * exp(-mmPourD * mmPourD * 9.0);

// Crema builds up as the cup fills.
float mmCover = mix(-0.42, 0.3, smoothstep(0.02, 0.85, uFill));
float mmCrema = smoothstep(0.26, 0.74, mmN + mmCover + mmSplash * 0.5);
mmCrema = max(mmCrema, smoothstep(0.86, 0.99, mmR) * smoothstep(0.1, 0.5, uFill) * 0.9);

vec3 mmDark = vec3(0.05, 0.02, 0.008);
vec3 mmHazel = vec3(0.27, 0.105, 0.03);
vec3 mmGold = vec3(0.52, 0.27, 0.09);
vec3 mmPale = vec3(0.74, 0.5, 0.25);

vec3 mmCol = mix(mmDark, mmHazel, mmCrema);
mmCol = mix(mmCol, mmGold, mmCrema * smoothstep(0.38, 0.78, mmN + mmFine * 0.25));
// "Tiger" flecking: fine darker streaks dragged along the swirl.
mmCol = mix(mmCol, mmHazel * 0.62, mmCrema * smoothstep(0.52, 0.72, mmFine) * 0.55);
mmCol = mix(mmCol, mmPale, mmCrema * (smoothstep(0.6, 0.9, mmN) * 0.38 + mmSplash * 0.6));

// Micro-bubbles gather near the rim and where the stream lands.
float mmBubbleZone = clamp(smoothstep(0.7, 0.98, mmR) + mmSplash * 1.5, 0.0, 1.0) * mmCrema;
float mmCell = mmCells(mmQ * 34.0);
float mmBubble = smoothstep(0.34, 0.16, mmCell) * mmBubbleZone;
mmCol = mix(mmCol, mmPale, mmBubble * 0.32);

// Soft occlusion where the liquid meets the ceramic wall.
mmCol *= mix(1.0, 0.5, smoothstep(0.84, 1.0, mmR));

diffuseColor.rgb = mmCol;
float mmRough = mix(0.06, 0.52, mmCrema);
float mmHeight = mmWaves(vDisc) * 0.02 + mmCrema * 0.004 + mmFine * mmCrema * 0.002;
`;

export const LIQUID_FRAGMENT_ROUGHNESS = /* glsl */ `
roughnessFactor = mmRough;
`;

/** Bump the shading normal from the height field (screen-space derivatives). */
export const LIQUID_FRAGMENT_NORMAL = /* glsl */ `
{
  vec3 mmDpdx = dFdx(vViewPosition);
  vec3 mmDpdy = dFdy(vViewPosition);
  float mmDhdx = dFdx(mmHeight);
  float mmDhdy = dFdy(mmHeight);
  vec3 mmR1 = cross(mmDpdy, normal);
  vec3 mmR2 = cross(normal, mmDpdx);
  float mmDet = dot(mmDpdx, mmR1);
  vec3 mmGrad = sign(mmDet) * (mmDhdx * mmR1 + mmDhdy * mmR2);
  normal = normalize(abs(mmDet) * normal - mmGrad * 1.6);
}
`;

export const STREAM_VERTEX_PARS = /* glsl */ `
uniform float uTime;
uniform float uThickness;
`;

/** The stream is a unit cylinder; its radius wobbles and necks like a real pour. */
export const STREAM_VERTEX_MAIN = /* glsl */ `
{
  float mmY = position.y;
  float mmWob = 1.0
    + sin(mmY * 21.0 + uTime * 17.0) * 0.07
    + sin(mmY * 47.0 + uTime * 29.0) * 0.04;
  // Gravity stretches the stream: thicker at the spout, thinner at the cup.
  float mmTaper = mix(0.72, 1.25, mmY);
  transformed.xz *= uThickness * mmWob * mmTaper;
  transformed.x += sin(mmY * 6.0 + uTime * 3.1) * 0.006;
}
`;

export const STEAM_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const STEAM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
${NOISE_GLSL}

void main() {
  float y = vUv.y;
  float x = vUv.x - 0.5;

  // The column drifts sideways more the higher it rises.
  x += (mmNoise(vec2(y * 1.4 - uTime * 0.11, uSeed)) - 0.5) * 0.42 * y;
  x += (mmNoise(vec2(y * 3.1 - uTime * 0.19, uSeed + 4.0)) - 0.5) * 0.12 * y;

  float width = mix(0.085, 0.3, pow(y, 0.8));
  float column = exp(-(x * x) / (width * width));

  vec2 p = vec2(x * 3.4, y * 2.3 - uTime * 0.21);
  float warp = mmFbm(p + uSeed);
  float density = mmFbm(p * 1.7 + vec2(warp * 1.9, -uTime * 0.08) + uSeed * 2.0);
  float wisps = smoothstep(0.3, 0.78, density);

  float fade = smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.35, 0.98, y));
  float alpha = column * wisps * fade * uOpacity;

  gl_FragColor = vec4(vec3(1.0, 0.955, 0.89) * alpha, alpha);
}
`;
