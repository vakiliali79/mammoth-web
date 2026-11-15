import * as THREE from "three";

/**
 * Procedural ceramic geometry (no external 3D assets).
 * Units: the cup rim radius is 1 (≈ 4.5 cm).
 */

export const CUP = {
  height: 1.15,
  innerBottom: 0.13,
  footTop: 0.07,
  /** y where the cup foot rests inside the saucer well */
  restY: 0.045,
  /** highest liquid level (cup-local y) */
  fillTop: 1.0,
};

/** Inner wall radius at cup-local height y (parabolic bowl with a flat bottom). */
export function innerRadius(y: number): number {
  const s = THREE.MathUtils.clamp((y - CUP.innerBottom) / (CUP.height - CUP.innerBottom), 0, 1);
  return 0.3 + 0.64 * Math.sqrt(s);
}

/** Cup-local liquid surface height for a fill amount in [0, 1]. */
export function liquidLevel(fill: number): number {
  return CUP.innerBottom + 0.015 + fill * (CUP.fillTop - CUP.innerBottom - 0.015);
}

export function createCupGeometry(segments: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const { height: H, innerBottom: yb, footTop } = CUP;

  // Underside + foot ring (walking outward so normals face down/out).
  pts.push(new THREE.Vector2(0, 0.03));
  pts.push(new THREE.Vector2(0.27, 0.03));
  pts.push(new THREE.Vector2(0.3, 0.0));
  pts.push(new THREE.Vector2(0.36, 0.0));
  pts.push(new THREE.Vector2(0.385, 0.02));
  pts.push(new THREE.Vector2(0.385, footTop - 0.01));

  // Outer wall, bottom → rim.
  const steps = 40;
  for (let i = 2; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector2(0.36 + 0.64 * t, footTop + (H - footTop) * t * t));
  }

  // Rounded lip.
  const lipR = 0.03;
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    pts.push(new THREE.Vector2(0.97 + Math.cos(a) * lipR, H + Math.sin(a) * lipR * 0.9));
  }

  // Inner wall, rim → bottom.
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    pts.push(new THREE.Vector2(0.3 + 0.64 * t, yb + (H - yb) * t * t));
  }
  pts.push(new THREE.Vector2(0.3, yb));
  pts.push(new THREE.Vector2(0.15, yb - 0.004));
  pts.push(new THREE.Vector2(0, yb - 0.006));

  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  fixLatheSeam(geo, pts.length, segments);
  return geo;
}

export function createSaucerGeometry(segments: number): THREE.BufferGeometry {
  // Top surface control points (centre → rim), smoothed with a spline.
  const top = new THREE.SplineCurve([
    new THREE.Vector2(0.5, 0.062),
    new THREE.Vector2(0.75, 0.078),
    new THREE.Vector2(1.1, 0.125),
    new THREE.Vector2(1.45, 0.205),
    new THREE.Vector2(1.7, 0.285),
  ]).getPoints(28);

  const pts: THREE.Vector2[] = [];
  // Underside, centre → rim.
  pts.push(new THREE.Vector2(0, 0.012));
  pts.push(new THREE.Vector2(0.7, 0.012));
  pts.push(new THREE.Vector2(0.74, 0));
  pts.push(new THREE.Vector2(0.86, 0));
  pts.push(new THREE.Vector2(0.9, 0.02));
  pts.push(new THREE.Vector2(1.2, 0.09));
  pts.push(new THREE.Vector2(1.5, 0.175));
  pts.push(new THREE.Vector2(1.7, 0.243));
  // Rim.
  pts.push(new THREE.Vector2(1.735, 0.262));
  pts.push(new THREE.Vector2(1.742, 0.28));
  pts.push(new THREE.Vector2(1.728, 0.295));
  // Top surface, rim → centre well.
  for (let i = top.length - 1; i >= 0; i--) pts.push(top[i]);
  pts.push(new THREE.Vector2(0.46, 0.058));
  pts.push(new THREE.Vector2(0.435, 0.047));
  pts.push(new THREE.Vector2(0.2, 0.045));
  pts.push(new THREE.Vector2(0, 0.045));

  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  fixLatheSeam(geo, pts.length, segments);
  return geo;
}

/** computeVertexNormals leaves a visible crease where a lathe closes; average the seam. */
function fixLatheSeam(geo: THREE.BufferGeometry, profileCount: number, segments: number) {
  const n = geo.attributes.normal as THREE.BufferAttribute;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let j = 0; j < profileCount; j++) {
    const first = j;
    const last = segments * profileCount + j;
    a.fromBufferAttribute(n, first);
    b.fromBufferAttribute(n, last);
    a.add(b).normalize();
    n.setXYZ(first, a.x, a.y, a.z);
    n.setXYZ(last, a.x, a.y, a.z);
  }
  n.needsUpdate = true;
}

export function createHandleGeometry(detail: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.955, 0.95, 0),
      new THREE.Vector3(1.16, 1.0, 0),
      new THREE.Vector3(1.47, 0.88, 0),
      new THREE.Vector3(1.53, 0.6, 0),
      new THREE.Vector3(1.32, 0.36, 0),
      new THREE.Vector3(0.98, 0.3, 0),
      new THREE.Vector3(0.7, 0.33, 0),
    ],
    false,
    "catmullrom",
    0.5,
  );
  const geo = new THREE.TubeGeometry(curve, detail, 0.062, 16, false);
  // Slightly oval cross-section, like a pulled ceramic handle.
  geo.scale(1, 1, 1.3);
  geo.computeVertexNormals();
  return geo;
}

/** Unit disc in the XZ plane with radial subdivisions (for wave displacement). */
export function createLiquidGeometry(radial: number, angular: number): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const indices: number[] = [];
  for (let r = 1; r <= radial; r++) {
    const radius = r / radial;
    for (let a = 0; a < angular; a++) {
      const th = (a / angular) * Math.PI * 2;
      positions.push(Math.cos(th) * radius, 0, Math.sin(th) * radius);
    }
  }
  const idx = (r: number, a: number) => 1 + (r - 1) * angular + (a % angular);
  for (let a = 0; a < angular; a++) indices.push(0, idx(1, a + 1), idx(1, a));
  for (let r = 1; r < radial; r++) {
    for (let a = 0; a < angular; a++) {
      const p0 = idx(r, a);
      const p1 = idx(r, a + 1);
      const p2 = idx(r + 1, a);
      const p3 = idx(r + 1, a + 1);
      indices.push(p0, p1, p2, p1, p3, p2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Soft radial falloff texture used for contact shadows and the light pool. */
export function createRadialTexture(inner: string, outer: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, mixStop(inner, outer));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mixStop(a: string, b: string): string {
  const pa = a.match(/[\d.]+/g)!.map(Number);
  const pb = b.match(/[\d.]+/g)!.map(Number);
  const m = pa.map((v, i) => v * 0.3 + pb[i] * 0.7);
  return `rgba(${m[0]},${m[1]},${m[2]},${m[3]})`;
}
