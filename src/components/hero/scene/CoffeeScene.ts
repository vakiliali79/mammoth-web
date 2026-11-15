import * as THREE from "three";
import {
  CUP,
  createCupGeometry,
  createHandleGeometry,
  createLiquidGeometry,
  createRadialTexture,
  createSaucerGeometry,
  innerRadius,
  liquidLevel,
} from "./geometry";
import {
  LIQUID_FRAGMENT_COLOR,
  LIQUID_FRAGMENT_NORMAL,
  LIQUID_FRAGMENT_PARS,
  LIQUID_FRAGMENT_ROUGHNESS,
  LIQUID_VERTEX_MAIN,
  LIQUID_VERTEX_PARS,
  STEAM_FRAGMENT,
  STEAM_VERTEX,
  STREAM_VERTEX_MAIN,
  STREAM_VERTEX_PARS,
} from "./shaders";

/**
 * Everything the scroll timeline animates. GSAP tweens these numbers;
 * the scene reads them every frame.
 */
export interface SceneState {
  /** Height of the cup above its resting place on the saucer */
  cupY: number;
  /** Cup rotation around the vertical axis (radians) */
  cupSpin: number;
  /** 0 = empty, 1 = full */
  fill: number;
  /** 0–1 progress of the pour stream (falls in at 0, tails off at 1) */
  pour: number;
  /** Steam opacity 0–1 */
  steam: number;
  /** Back-light glow + backdrop brightening 0–1 (kept as `warmth` for the timeline) */
  warmth: number;
  saucerDip: number;
  camX: number;
  camY: number;
  camZ: number;
  tgtX: number;
  tgtY: number;
  tgtZ: number;
  /** Shifts the picture inside the frame (fraction of viewport, + = right / down) */
  shiftX: number;
  shiftY: number;
}

export const initialState = (): SceneState => ({
  cupY: 1.15,
  cupSpin: -0.55,
  fill: 0,
  pour: 0,
  steam: 0,
  warmth: 0,
  saucerDip: 0,
  camX: 0,
  camY: 2.85,
  camZ: 10.2,
  tgtX: 0,
  tgtY: 1.5,
  tgtZ: 0,
  shiftX: 0,
  shiftY: -0.035,
});

export type Quality = "high" | "low";

const POUR_POS = new THREE.Vector2(-0.16, 0.1);
const STREAM_TOP = 9;

export class CoffeeScene {
  readonly state = initialState();
  /** Camera distance multiplier (set by the host for narrow/portrait viewports) */
  fit = 1;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  private cup = new THREE.Group();
  private saucer: THREE.Mesh;
  private liquid: THREE.Mesh;
  private stream: THREE.Mesh;
  private steam: THREE.Mesh[] = [];
  private cupShadow: THREE.Mesh;
  private glow: THREE.PointLight;
  private uniforms = {
    uTime: { value: 0 },
    uAgitation: { value: 0 },
    uPour: { value: 0 },
    uPourPos: { value: POUR_POS.clone() },
    uFill: { value: 0 },
    uSwirl: { value: 0 },
    uThickness: { value: 0 },
  };
  private disposables: { dispose(): void }[] = [];

  private raf = 0;
  private running = false;
  private lastTime = 0;
  private time = 0;
  private frozen = false;
  private lastSignature = "";
  private lastShadowSignature = "";
  private lastSteamFrame = 0;
  // Adaptive resolution: if frames are consistently slow, render fewer pixels.
  private dpr = 1;
  private resolutionScale = 1;
  private slowFrames = 0;
  private frameEma = 16;
  private width = 1;
  private height = 1;

  // Liquid slosh (damped spring driven by the cup's vertical acceleration).
  private tilt = 0;
  private tiltVel = 0;
  private prevCupY = this.state.cupY;
  private prevVel = 0;
  private agitation = 0;

  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement, private quality: Quality) {
    const high = quality === "high";

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Re-rendered on demand (see update()): steam-only frames reuse the last shadow map.
    this.renderer.shadowMap.autoUpdate = false;

    this.scene.environment = this.buildEnvironment();
    this.scene.environmentIntensity = 1.05;

    // ── Ceramic ─────────────────────────────────────────────────────────
    const ceramic = new THREE.MeshPhysicalMaterial({
      color: 0xf3f6f9,
      roughness: 0.3,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.09,
      side: THREE.DoubleSide,
    });
    this.track(ceramic);

    const segments = high ? 128 : 72;
    const body = new THREE.Mesh(this.track(createCupGeometry(segments)), ceramic);
    const handle = new THREE.Mesh(this.track(createHandleGeometry(high ? 64 : 40)), ceramic);
    for (const m of [body, handle]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    this.cup.add(body, handle);

    this.saucer = new THREE.Mesh(this.track(createSaucerGeometry(segments)), ceramic);
    this.saucer.castShadow = true;
    this.saucer.receiveShadow = true;
    this.scene.add(this.saucer, this.cup);

    // ── Coffee surface ──────────────────────────────────────────────────
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0,
      // Kept moderate: at grazing angles a strong studio reflection would hide the crema.
      envMapIntensity: 0.7,
    });
    liquidMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = `#define MM_OCTAVES ${high ? 5 : 4}\n${shader.fragmentShader}`;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${LIQUID_VERTEX_PARS}`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>\n${LIQUID_VERTEX_MAIN}`);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${LIQUID_FRAGMENT_PARS}`)
        .replace("#include <color_fragment>", `#include <color_fragment>\n${LIQUID_FRAGMENT_COLOR}`)
        .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${LIQUID_FRAGMENT_ROUGHNESS}`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${LIQUID_FRAGMENT_NORMAL}`);
    };
    this.track(liquidMat);
    this.liquid = new THREE.Mesh(this.track(createLiquidGeometry(high ? 40 : 24, high ? 128 : 72)), liquidMat);
    this.liquid.receiveShadow = true;
    this.liquid.visible = false;
    this.cup.add(this.liquid);

    // ── Pour stream ─────────────────────────────────────────────────────
    const streamGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 48, true);
    streamGeo.translate(0, 0.5, 0);
    const streamMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b1707,
      emissive: 0x160702,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.6,
    });
    streamMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${STREAM_VERTEX_PARS}`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>\n${STREAM_VERTEX_MAIN}`);
    };
    this.track(streamGeo);
    this.track(streamMat);
    this.stream = new THREE.Mesh(streamGeo, streamMat);
    this.stream.castShadow = true;
    this.stream.visible = false;
    this.stream.frustumCulled = false;
    this.scene.add(this.stream);

    // ── Steam (camera-facing sheets with a noise-driven wisp shader) ────
    const steamGeo = this.track(new THREE.PlaneGeometry(2.6, 4.2));
    steamGeo.translate(0, 2.1, 0);
    // Steam is full-screen-ish alpha overdraw, the most expensive thing on a phone GPU:
    // the low tier draws one sheet (slightly denser) with fewer noise octaves.
    const sheets: (readonly [number, number])[] = high ? [[1.7, 1], [6.3, 0.82]] : [[1.7, 1]];
    for (const [seed, scale] of sheets) {
      const mat = new THREE.ShaderMaterial({
        defines: { MM_OCTAVES: high ? 5 : 3 },
        vertexShader: STEAM_VERTEX,
        fragmentShader: STEAM_FRAGMENT,
        uniforms: { uTime: this.uniforms.uTime, uOpacity: { value: 0 }, uSeed: { value: seed } },
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      this.track(mat);
      const mesh = new THREE.Mesh(steamGeo, mat);
      mesh.scale.setScalar(scale);
      mesh.visible = false;
      mesh.renderOrder = 10;
      this.steam.push(mesh);
      this.scene.add(mesh);
    }

    // ── Ground: real shadow catcher + soft contact shadows + light pool ──
    const groundMat = this.track(new THREE.ShadowMaterial({ opacity: 0.55 }));
    const ground = new THREE.Mesh(this.track(new THREE.PlaneGeometry(60, 60)), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const poolTex = this.track(createRadialTexture("rgba(169,213,232,0.16)", "rgba(169,213,232,0)"));
    const pool = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(15, 15)),
      this.track(
        new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, toneMapped: false }),
      ),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-0.6, 0.002, 0.4);
    pool.renderOrder = -2;
    this.scene.add(pool);

    const blobTex = this.track(createRadialTexture("rgba(0,0,0,0.85)", "rgba(0,0,0,0)"));
    const blobMat = (opacity: number) =>
      this.track(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity, toneMapped: false }));
    const blobGeo = this.track(new THREE.PlaneGeometry(1, 1));

    const saucerShadow = new THREE.Mesh(blobGeo, blobMat(0.75));
    saucerShadow.rotation.x = -Math.PI / 2;
    saucerShadow.scale.setScalar(4.3);
    saucerShadow.position.y = 0.004;
    saucerShadow.renderOrder = -1;
    this.scene.add(saucerShadow);

    this.cupShadow = new THREE.Mesh(blobGeo, blobMat(0));
    this.cupShadow.rotation.x = -Math.PI / 2;
    this.cupShadow.position.y = 0.075;
    this.cupShadow.renderOrder = 1;
    this.saucer.add(this.cupShadow);

    // ── Lights ──────────────────────────────────────────────────────────
    const key = new THREE.SpotLight(0xfff7ee, 260, 30, 0.42, 0.95, 2);
    key.position.set(-4.2, 8.5, 4.6);
    key.target.position.set(0, 0.8, 0);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(high ? 2048 : 1024);
    key.shadow.camera.near = 4;
    key.shadow.camera.far = 16;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.06;
    key.shadow.radius = 7;
    this.scene.add(key, key.target);
    this.track(key);

    const rim = new THREE.DirectionalLight(0xa9d5e8, 1.7);
    rim.position.set(5, 3.2, -6);
    this.scene.add(rim);

    const rim2 = new THREE.DirectionalLight(0x5aa6d0, 0.45);
    rim2.position.set(-6, 2.5, -4);
    this.scene.add(rim2);

    this.scene.add(new THREE.HemisphereLight(0xc5dbe8, 0x0b1a26, 0.65));

    this.glow = new THREE.PointLight(0x7cc4ea, 0, 12, 2);
    this.glow.position.set(0.6, 1.7, -2.6);
    this.scene.add(this.glow);
  }

  private track<T extends { dispose(): void }>(resource: T): T {
    this.disposables.push(resource);
    return resource;
  }

  /** A small procedural photo studio (softboxes on black) baked into an environment map. */
  private buildEnvironment(): THREE.Texture {
    const studio = new THREE.Scene();
    const box = (w: number, h: number, color: number, intensity: number, pos: [number, number, number]) => {
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      mat.color.multiplyScalar(intensity);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(...pos);
      mesh.lookAt(0, 0, 0);
      studio.add(mesh);
    };
    box(9, 6, 0xfffaf4, 5.5, [-5, 9, 4]); // key softbox
    box(2.2, 9, 0xa9d5e8, 4, [9, 3, -3]); // light-blue strip
    box(2, 7, 0x8cc3e0, 1.6, [-9, 2.5, -5]); // cool kicker
    box(14, 4, 0xf4f7fa, 1.5, [0, 3, 11]); // front fill
    box(30, 30, 0x082b40, 0.6, [0, -6, 0]); // deep-blue floor bounce
    studio.background = new THREE.Color(0x04070a);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const target = pmrem.fromScene(studio, 0.035);
    pmrem.dispose();
    studio.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.track(target);
    return target.texture;
  }

  setSize(width: number, height: number, dpr: number) {
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.applyResolution();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.lastSignature = "";
  }

  private applyResolution() {
    const cap = this.quality === "high" ? 2 : 1.5;
    // Never go below 1 device pixel per CSS pixel × 0.75 — below that the cup rim visibly aliases.
    const ratio = Math.max(0.75, Math.min(this.dpr, cap) * this.resolutionScale);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.width, this.height, false);
  }

  /** Current width/height ratio of the drawing surface. */
  get aspect() {
    return this.width / this.height;
  }

  /** Normalised pointer position in [-1, 1] for a subtle camera parallax. */
  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }

  /** Reduced-motion mode: time stands still and a single frame is drawn on demand. */
  freeze(time = 6) {
    this.frozen = true;
    this.time = time;
  }

  start() {
    if (this.running || this.frozen) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const elapsed = now - this.lastTime;
    this.lastTime = now;
    this.update(Math.min(0.05, elapsed / 1000), false, elapsed, now);
  };

  /** Draws one frame immediately (used for the first paint and reduced motion). */
  renderNow() {
    this.update(0, true);
  }

  private update(dt: number, force = false, elapsedMs = 16, now = 0) {
    const s = this.state;
    if (!this.frozen) this.time += dt;

    // ── Slosh physics ──
    let moving = false;
    if (dt > 0) {
      const vel = (s.cupY - this.prevCupY) / dt;
      const accel = THREE.MathUtils.clamp((vel - this.prevVel) / dt, -60, 60);
      this.prevCupY = s.cupY;
      this.prevVel = vel;
      this.tiltVel += accel * 0.0022;
      this.tiltVel += (-this.tilt * 70 - this.tiltVel * 5.5) * dt;
      this.tilt = THREE.MathUtils.clamp(this.tilt + this.tiltVel * dt, -0.07, 0.07);

      const pourActive = s.pour > 0.06 && s.pour < 0.97 ? 1 : 0;
      const targetAgit = Math.min(1, Math.abs(vel) * 0.5 + Math.abs(this.tiltVel) * 2 + pourActive * 0.55);
      this.agitation += (targetAgit - this.agitation) * Math.min(1, dt * (targetAgit > this.agitation ? 8 : 1.6));

      this.pointerSmooth.lerp(this.pointer, Math.min(1, dt * 3));
      moving =
        this.agitation > 0.004 ||
        Math.abs(this.tilt) > 0.0004 ||
        Math.abs(this.tiltVel) > 0.002 ||
        this.pointerSmooth.distanceToSquared(this.pointer) > 1e-6;
    }

    // Skip the GPU entirely when nothing on screen can have changed.
    const animated = s.steam > 0.002 || (s.pour > 0.001 && s.pour < 0.999) || moving;
    const signature = `${s.cupY.toFixed(4)}|${s.cupSpin.toFixed(4)}|${s.fill.toFixed(4)}|${s.pour.toFixed(4)}|${s.steam.toFixed(3)}|${s.warmth.toFixed(3)}|${s.camX.toFixed(3)}|${s.camY.toFixed(3)}|${s.camZ.toFixed(3)}|${s.tgtX.toFixed(3)}|${s.tgtY.toFixed(3)}|${s.shiftX.toFixed(3)}|${s.shiftY.toFixed(3)}|${this.fit.toFixed(3)}`;
    const changed = signature !== this.lastSignature;
    if (!force && !animated && !changed) return;
    // When only the steam is drifting (no scroll, no slosh, no pour) 30 fps is indistinguishable
    // from 60 and halves the GPU/battery cost of the state visitors linger on the longest.
    const steamOnly = !force && !changed && !moving && !(s.pour > 0.001 && s.pour < 0.999);
    if (steamOnly && now - this.lastSteamFrame < 30) return;
    this.lastSteamFrame = now;
    this.lastSignature = signature;

    // Adaptive resolution: sustained slow frames → step the pixel ratio down (never back up,
    // to avoid oscillating). Only counted while continuously animating.
    if (!force && (animated || changed) && elapsedMs < 250) {
      this.frameEma += (elapsedMs - this.frameEma) * 0.1;
      const budget = steamOnly ? 45 : 26;
      this.slowFrames = this.frameEma > budget ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
      if (this.slowFrames > 45 && this.resolutionScale > 0.6) {
        this.resolutionScale = Math.max(0.6, this.resolutionScale * 0.82);
        this.slowFrames = 0;
        this.frameEma = 16;
        this.applyResolution();
      }
    }

    // ── Cup & saucer ──
    this.saucer.position.y = -s.saucerDip;
    this.cup.position.y = CUP.restY + s.cupY - s.saucerDip;
    this.cup.rotation.y = s.cupSpin;

    const lift = THREE.MathUtils.clamp(s.cupY / 1.15, 0, 1);
    const shadowMat = this.cupShadow.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = 0.8 * (1 - lift) ** 1.6;
    this.cupShadow.scale.setScalar(1.25 + lift * 1.3);

    // ── Liquid ──
    const level = liquidLevel(s.fill);
    const grow = THREE.MathUtils.smoothstep(s.fill, 0, 0.035);
    const radius = (innerRadius(level) + 0.006) * Math.max(0.0001, grow);
    this.liquid.visible = s.fill > 0.0005;
    // The first drops form a puddle under the stream (not in the middle of the cup), then spread.
    const cosSpin = Math.cos(s.cupSpin);
    const sinSpin = Math.sin(s.cupSpin);
    const localPourX = cosSpin * POUR_POS.x - sinSpin * POUR_POS.y;
    const localPourZ = sinSpin * POUR_POS.x + cosSpin * POUR_POS.y;
    this.liquid.position.set(localPourX * (1 - grow), level, localPourZ * (1 - grow));
    this.liquid.scale.set(radius, 1, radius);
    this.liquid.rotation.z = this.tilt;
    this.liquid.rotation.x = this.tilt * 0.6;

    const pourIn = THREE.MathUtils.smoothstep(s.pour, 0, 0.1);
    const pourOut = 1 - THREE.MathUtils.smoothstep(s.pour, 0.9, 1);
    const flowing = s.pour > 0.085 && s.pour < 0.995 ? Math.min(pourIn, pourOut * 1.4, 1) : 0;

    const u = this.uniforms;
    u.uTime.value = this.time;
    u.uFill.value = s.fill;
    u.uAgitation.value = this.agitation;
    u.uPour.value = flowing;
    u.uSwirl.value = 1.2 + s.fill * 4.2;
    // The stream lands at a fixed point in space; express it in the spinning liquid's disc coordinates.
    const inv = 1 / Math.max(radius, 0.3);
    u.uPourPos.value.set((localPourX - this.liquid.position.x) * inv, (localPourZ - this.liquid.position.z) * inv);

    // ── Stream: falls in from above, then its tail drops away ──
    const surfaceY = this.cup.position.y + level;
    const bottomY = THREE.MathUtils.lerp(STREAM_TOP, surfaceY, pourIn);
    const topY = THREE.MathUtils.lerp(STREAM_TOP, surfaceY, 1 - pourOut);
    const length = topY - bottomY;
    this.stream.visible = length > 0.02 && s.pour > 0.001 && s.pour < 0.999;
    this.stream.position.set(POUR_POS.x, bottomY - 0.01, POUR_POS.y);
    this.stream.scale.set(1, Math.max(length, 0.001), 1);
    u.uThickness.value = 0.05 * (0.55 + 0.45 * Math.min(1, pourOut * 3));

    // ── Steam ──
    for (let i = 0; i < this.steam.length; i++) {
      const mesh = this.steam[i];
      mesh.visible = s.steam > 0.002;
      mesh.position.set(i === 0 ? 0.05 : -0.12, surfaceY - 0.05, i === 0 ? 0 : -0.15);
      mesh.rotation.y = Math.atan2(s.camX - s.tgtX, s.camZ - s.tgtZ) + (i === 0 ? 0 : 0.5);
      (mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = s.steam * (i === 0 ? (this.steam.length === 1 ? 1.15 : 0.95) : 0.6);
    }

    this.glow.intensity = s.warmth * 55;

    // ── Camera ──
    const px2 = this.pointerSmooth.x * 0.22;
    const py2 = this.pointerSmooth.y * 0.12;
    const f = this.fit;
    this.camera.position.set(
      s.tgtX + (s.camX - s.tgtX) * f + px2,
      s.tgtY + (s.camY - s.tgtY) * f - py2,
      s.tgtZ + (s.camZ - s.tgtZ) * f,
    );
    this.camera.lookAt(s.tgtX, s.tgtY, s.tgtZ);
    if (s.shiftX !== 0 || s.shiftY !== 0) {
      this.camera.setViewOffset(
        this.width,
        this.height,
        -s.shiftX * this.width,
        -s.shiftY * this.height,
        this.width,
        this.height,
      );
    } else if (this.camera.view?.enabled) {
      this.camera.clearViewOffset();
    }

    const shadowSignature = `${s.cupY.toFixed(3)}|${s.cupSpin.toFixed(3)}|${s.fill.toFixed(3)}|${s.pour.toFixed(3)}|${s.saucerDip.toFixed(4)}|${this.tilt.toFixed(3)}`;
    if (force || shadowSignature !== this.lastShadowSignature) {
      this.lastShadowSignature = shadowSignature;
      this.renderer.shadowMap.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /** After a lost WebGL context is restored, everything must be drawn again. */
  invalidate() {
    this.lastSignature = "";
    this.lastShadowSignature = "";
  }

  dispose() {
    this.stop();
    for (const d of this.disposables) d.dispose();
    this.scene.environment = null;
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    // Release the GPU context now instead of waiting for garbage collection
    // (browsers cap live WebGL contexts; visitors may open and leave the homepage repeatedly).
    this.renderer.forceContextLoss();
  }
}
