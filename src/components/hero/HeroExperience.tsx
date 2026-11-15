"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { localePath, type Dictionary, type Locale } from "@/lib/i18n";
import type { SceneState } from "./scene/CoffeeScene";

interface HeroProps {
  locale: Locale;
  t: Dictionary["hero"];
  brand: Dictionary["brand"];
}

type Status = "loading" | "ready" | "fallback";

type Pose = Pick<SceneState, "camX" | "camY" | "camZ" | "tgtY" | "shiftX" | "shiftY">;

/** tan(fov / 2) for the scene's 32° vertical field of view. */
const HALF_FOV_TAN = Math.tan((16 * Math.PI) / 180);

/**
 * Places the camera along `dir` from the look-at point, at the art-directed
 * distance `base` or further — far enough that `needWidth` world units on each
 * side of the target fit the viewport. This is what keeps the cup and saucer
 * un-cropped on portrait phones without changing the desktop composition.
 */
function frame(dir: [number, number, number], tgtY: number, base: number, needWidth: number, aspect: number, shiftX: number, shiftY: number): Pose {
  const length = Math.hypot(...dir);
  const distance = Math.max(base, needWidth / (HALF_FOV_TAN * aspect));
  const k = distance / length;
  return { camX: dir[0] * k, camY: tgtY + dir[1] * k, camZ: dir[2] * k, tgtY, shiftX, shiftY };
}

/** Camera for each of the five scenes, for the current aspect ratio and layout. */
function poses(aspect: number, wide: boolean, rtl: boolean) {
  // Desktop: captions sit at the inline-start side, the cup slides to the other side.
  const side = wide ? (rtl ? -0.17 : 0.17) : 0;
  // Phones/tablets: captions sit at the bottom, the picture moves up.
  // Tablets (wider portrait) have less spare height above the caption than phones do.
  const up = wide ? 0 : -(0.12 + Math.min(0.07, Math.max(0, (aspect - 0.5) * 0.28)));
  const offCentre = 1 / (1 - 2 * Math.abs(side));
  // Landscape tablets use the bottom-caption layout but have little height: stand further back.
  const k = !wide && aspect > 1 ? 1.4 : 1;
  const SAUCER = 1.95; // saucer radius + margin
  const CUP = 1.2; // cup rim + margin
  const HANDLE = 1.75; // cup including its handle
  return {
    intro: frame([0, 1.35, 10.2], 1.5, k > 1 ? 12.4 : 10.3, SAUCER, aspect, 0, -0.035),
    // On touch layouts the top-down pour view must also clear the caption below it (height-bound on tablets).
    pour: frame([0, 4.35, 4.3], 1.95, wide ? 6.1 : 11.5, wide ? CUP * offCentre : SAUCER - 0.1, aspect, side, up),
    land: frame([4.5, 1.5, 6.3], 0.8, 7.9 * k, SAUCER * offCentre, aspect, side, up),
    steam: frame(wide ? [1.5, 2.6, 3.5] : [1.2, 3.3, 3.4], 1.1, wide ? 4.6 : 10, wide ? HANDLE * offCentre : SAUCER - 0.1, aspect, side, up),
    // The closing line sits under the saucer, so the picture is lifted well clear of it.
    reveal: frame([-0.6, 2.15, 5.5], 1.0, wide ? 7.8 : 5.7 * k, wide ? 1.5 : 1.8, aspect, 0, wide ? -0.22 : k > 1 ? -0.2 : -0.13),
    still: frame([2.6, 1.55, 7.2], 0.95, 9, SAUCER * 1.2, aspect, 0, -0.01),
  };
}

/**
 * The signature experience: a pinned, scroll-scrubbed WebGL scene.
 * GSAP ScrollTrigger maps scroll progress onto `scene.state` (cup, liquid,
 * steam, camera) and onto the DOM captions in the same timeline.
 */
export function HeroExperience({ locale, t, brand }: HeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const rtl = locale === "fa";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { CoffeeScene, initialState }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("./scene/CoffeeScene"),
      ]);
      if (disposed) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const small = window.matchMedia("(max-width: 767px)").matches;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const lowPower = small || coarse || (navigator.hardwareConcurrency ?? 8) <= 4;

      let scene: InstanceType<typeof CoffeeScene>;
      try {
        scene = new CoffeeScene(canvas, lowPower ? "low" : "high");
      } catch {
        setStatus("fallback");
        return;
      }
      const s = scene.state;
      const q = gsap.utils.selector(root);

      let lastW = 0;
      let lastH = 0;
      const resize = () => {
        const { width, height } = root.getBoundingClientRect();
        if (!width || !height || (width === lastW && height === lastH)) return;
        lastW = width;
        lastH = height;
        scene.setSize(width, height, window.devicePixelRatio || 1);
        if (reduced) Object.assign(s, poses(scene.aspect, false, rtl).still);
        scene.renderNow();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(root);

      // Mobile browsers drop WebGL contexts under memory pressure; recover instead of going blank.
      const onLost = (e: Event) => {
        e.preventDefault();
        scene.stop();
      };
      const onRestored = () => {
        scene.invalidate();
        scene.renderNow();
        if (!document.hidden && root.getBoundingClientRect().bottom > 0) scene.start();
      };
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);

      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !document.hidden) scene.start();
        else scene.stop();
      });
      io.observe(root);
      const onVisibility = () => {
        if (document.hidden) scene.stop();
        else if (root.getBoundingClientRect().bottom > 0) scene.start();
      };
      document.addEventListener("visibilitychange", onVisibility);

      const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      };
      if (!reduced) window.addEventListener("pointermove", onPointer, { passive: true });

      const ctx = gsap.context(() => {
        if (reduced) {
          // No pinning, no scrubbing: a single calm frame of the finished cup.
          Object.assign(s, { cupY: 0, cupSpin: -0.35, fill: 1, pour: 0, steam: 0.9, warmth: 0.5 } satisfies Partial<SceneState>);
          scene.freeze();
          return;
        }

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        const mm = gsap.matchMedia();
        // Side-by-side captions need real width: below 1280px they would sit on top of the cup.
        mm.add({ wide: "(min-width: 1280px)", narrow: "(max-width: 1279.98px)" }, (context) => {
          const wide = Boolean(context.conditions?.wide);
          // A breakpoint change rebuilds the timeline: start it from a clean scene.
          Object.assign(s, initialState());
          // Function-based values are re-read on every ScrollTrigger refresh, so rotating the
          // device or resizing the window re-frames every scene for the new aspect ratio.
          const pose = (name: keyof ReturnType<typeof poses>) => {
            const read = (key: keyof Pose) => () => poses(scene.aspect, wide, rtl)[name][key];
            return { camX: read("camX"), camY: read("camY"), camZ: read("camZ"), tgtY: read("tgtY"), shiftX: read("shiftX"), shiftY: read("shiftY") };
          };

          gsap.set(q("[data-scene]:not([data-scene='0'])"), { autoAlpha: 0, y: 36 });

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            // Exposes the smoothed timeline position (used by the e2e tests).
            onUpdate: () => {
              root.dataset.progress = tl.progress().toFixed(3);
            },
            scrollTrigger: {
              trigger: root,
              start: "top top",
              // ≈5 screens with a wheel/trackpad; shorter and more direct under a thumb.
              end: () => `+=${window.innerHeight * (wide ? 5 : 3.6)}`,
              pin: true,
              scrub: wide ? 0.85 : 0.55,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          const cam = (at: number, dur: number, name: keyof ReturnType<typeof poses>, ease = "power2.inOut") =>
            tl.to(s, { ...pose(name), duration: dur, ease }, at);
          const caption = (i: number, inAt: number, outAt: number | null) => {
            tl.to(q(`[data-scene='${i}']`), { autoAlpha: 1, y: 0, duration: 5, ease: "power2.out" }, inAt);
            if (outAt !== null) tl.to(q(`[data-scene='${i}']`), { autoAlpha: 0, y: -36, duration: 4, ease: "power2.in" }, outAt);
          };

          // Scene 1 — introduction
          tl.set(s, pose("intro"), 0);
          tl.to(q("[data-scene='0']"), { autoAlpha: 0, y: -50, duration: 7, ease: "power2.in" }, 4);
          tl.to(q("[data-hint]"), { autoAlpha: 0, duration: 3 }, 2);
          tl.to(q("[data-giant]"), { autoAlpha: 0, scale: 1.12, duration: 10, ease: "power1.in" }, 5);
          tl.to(s, { cupSpin: 0.5, duration: 96, ease: "none" }, 4);

          // Scene 2 — the pour (camera rises to look into the cup)
          cam(8, 14, "pour");
          tl.to(s, { pour: 1, duration: 27, ease: "none" }, 17.5);
          tl.to(s, { fill: 1, duration: 23, ease: "sine.inOut" }, 20.2);
          caption(1, 16, 40);

          // Scene 3 — the cup settles on its saucer
          cam(44, 15, "land");
          tl.to(s, { cupY: 0, duration: 11, ease: "power2.in" }, 47);
          tl.to(s, { saucerDip: 0.022, duration: 0.9, ease: "power2.out" }, 58);
          tl.to(s, { saucerDip: 0, duration: 3.2, ease: "elastic.out(1.1, 0.45)" }, 58.9);
          caption(2, 50, 62);

          // Scene 4 — steam and a close look at the crema
          tl.to(s, { steam: 1, duration: 10, ease: "power1.inOut" }, 60);
          tl.to(s, { warmth: 0.55, duration: 14 }, 62);
          cam(62, 15, "steam");
          caption(3, 68, 82);

          // Scene 5 — cinematic reveal
          cam(80, 20, "reveal", "power1.inOut");
          tl.to(q("[data-scrim]"), { opacity: 1, duration: 8, ease: "none" }, 84);
          tl.to(s, { warmth: 1, duration: 18 }, 80);
          tl.to(q("[data-warm]"), { opacity: 1, duration: 20, ease: "none" }, 78);
          caption(4, 88, null);
          tl.set({}, {}, 100);

          return () => {
            gsap.set(q("[data-scene]"), { clearProps: "all" });
          };
        });
      }, root);

      resize();
      if (!reduced) scene.renderNow();
      setStatus("ready");

      cleanup = () => {
        ctx.revert();
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointer);
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
        scene.dispose();
      };
    })().catch(() => setStatus("fallback"));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [rtl]);

  const captionBase =
    "absolute max-w-md px-6 bottom-[9svh] inset-x-0 text-center xl:text-start xl:px-0 xl:bottom-auto xl:top-1/2 xl:-translate-y-1/2 xl:inset-x-auto xl:start-[max(2.5rem,calc((100vw-82rem)/2+2.5rem))] mx-auto xl:mx-0";

  return (
    <section
      ref={rootRef}
      // The stage is the LARGE viewport tall, so nothing peeks out underneath the pinned hero when a
      // phone's address bar collapses; captions live in the SMALL viewport box and are never covered.
      className="on-dark relative h-screen min-h-[560px] overflow-hidden bg-black text-soft supports-[height:100lvh]:h-lvh"
      aria-label={`${brand.en} — ${brand.tagline}`}
    >
      {/* Backdrop: deep-blue darkness that brightens at the end of the scroll */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_42%,#0d3048_0%,#0a1a26_48%,#080b0f_100%)]" />
      <div
        data-warm
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_45%,#1d5a80_0%,#123b55_42%,#081a27_100%)] opacity-0"
      />

      {/* Giant wordmark sitting BEHIND the cup */}
      <div aria-hidden="true" data-giant className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="font-display -translate-y-[6svh] text-[17.5vw] leading-none font-medium tracking-[-0.02em] text-soft/[0.07] select-none">
          MAMMOTH
        </span>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t.canvasLabel}
        className={`absolute inset-0 z-10 size-full transition-opacity duration-[1400ms] ${status === "ready" ? "opacity-100" : "opacity-0"}`}
      />
      {status === "fallback" && (
        // eslint-disable-next-line @next/next/no-img-element -- static poster, only when WebGL is unavailable
        <img src="/images/hero-poster.jpg" alt={t.canvasLabel} className="absolute inset-0 z-10 size-full object-cover" />
      )}

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(4,7,10,0.6)_100%)]" />

      {/* Keeps captions legible where they overlap the saucer */}
      <div
        data-scrim
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[52%] bg-gradient-to-t from-black/95 via-black/60 to-transparent xl:opacity-0"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-svh min-h-[560px] *:pointer-events-auto">
      {/* Scene 1 — brand introduction (server-rendered, visible before any JS) */}
      <div data-scene="0" className="absolute inset-0 flex flex-col items-center justify-between px-6 pt-[15svh] pb-[12svh] text-center">
        <div>
          <p className="mb-4 text-sm font-medium text-sky">{rtl ? brand.fa : "Specialty Coffee"}</p>
          <h1 className="font-display text-[clamp(1.75rem,7.4vw,5.6rem)] leading-none font-light tracking-[0.18em] whitespace-nowrap">
            MAMMOTH <span className="text-red">CAFE</span>
          </h1>
        </div>
        <p className="display-title max-w-[18ch] text-[clamp(1.5rem,3.4vw,2.4rem)] md:max-w-none text-soft">
          {rtl ? `«${t.scenes[0].title}»` : t.scenes[0].title}
        </p>
      </div>

      {t.scenes.slice(1, 4).map((scene, i) => (
        <div key={scene.title} data-scene={i + 1} className={`${captionBase} invisible`}>
          <p className="eyebrow mb-4 text-sky!">{scene.eyebrow}</p>
          <h2 className="display-title text-[clamp(1.9rem,4.6vw,3.6rem)]">{scene.title}</h2>
          <p className="mt-4 text-base leading-loose text-soft/75 xl:text-lg">{scene.body}</p>
        </div>
      ))}

      <div data-scene="4" className="invisible absolute inset-x-0 bottom-[9svh] flex flex-col items-center px-6 text-center">
        <h2 className="display-title text-[clamp(2rem,5.4vw,4.2rem)]">{t.scenes[4].title}</h2>
        <Link href={localePath(locale, "/menu")} className="btn btn-soft mt-7">
          {t.cta}
          <Arrow className="size-4" />
        </Link>
      </div>

      {/* Scroll hint */}
      <div data-hint aria-hidden="true" className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 text-xs text-soft/65">
        <span>{t.scroll}</span>
        <span className="block h-8 w-px bg-soft/70 [animation:scroll-hint_2.2s_ease-in-out_infinite]" />
      </div>
      </div>

      {/* Loading curtain */}
      <div
        className={`hero-loader absolute inset-0 z-40 grid place-items-center bg-black transition-[opacity,visibility] duration-1000 ${
          status === "loading" ? "visible opacity-100" : "invisible opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-5">
          <LogoMark className="size-16 animate-pulse text-sky" />
          <span className="text-xs text-soft/60">{t.loading}</span>
        </div>
      </div>
    </section>
  );
}
