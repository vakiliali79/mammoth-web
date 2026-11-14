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
      const [{ default: gsap }, { ScrollTrigger }, { CoffeeScene }] = await Promise.all([
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

      const resize = () => {
        const { width, height } = root.getBoundingClientRect();
        if (!width || !height) return;
        const aspect = width / height;
        // Pull the camera back on portrait screens so the saucer always fits.
        scene.fit = Math.max(1, 0.74 / aspect);
        scene.setSize(width, height, window.devicePixelRatio || 1);
        scene.renderNow();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(root);

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
          Object.assign(s, {
            cupY: 0, cupSpin: -0.35, fill: 1, pour: 0, steam: 0.9, warmth: 0.5,
            camX: 2.6, camY: 2.5, camZ: 7.2, tgtX: 0, tgtY: 0.95, tgtZ: 0, shiftY: 0.03,
          } satisfies Partial<SceneState>);
          scene.freeze();
          return;
        }

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        const mm = gsap.matchMedia();
        mm.add({ wide: "(min-width: 1024px)", narrow: "(max-width: 1023.98px)" }, (context) => {
          const wide = Boolean(context.conditions?.wide);
          // Captions sit at the inline-start side on desktop, so the cup slides the other way.
          const side = wide ? (rtl ? -0.17 : 0.17) : 0;
          const up = wide ? 0 : -0.11;

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
              end: () => `+=${window.innerHeight * (wide ? 5.2 : 4.4)}`,
              pin: true,
              scrub: 0.85,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          const cam = (at: number, dur: number, v: Partial<SceneState>, ease = "power2.inOut") => tl.to(s, { ...v, duration: dur, ease }, at);
          const caption = (i: number, inAt: number, outAt: number | null) => {
            tl.to(q(`[data-scene='${i}']`), { autoAlpha: 1, y: 0, duration: 5, ease: "power2.out" }, inAt);
            if (outAt !== null) tl.to(q(`[data-scene='${i}']`), { autoAlpha: 0, y: -36, duration: 4, ease: "power2.in" }, outAt);
          };

          // Scene 1 — introduction
          tl.to(q("[data-scene='0']"), { autoAlpha: 0, y: -50, duration: 7, ease: "power2.in" }, 4);
          tl.to(q("[data-hint]"), { autoAlpha: 0, duration: 3 }, 2);
          tl.to(q("[data-giant]"), { autoAlpha: 0, scale: 1.12, duration: 10, ease: "power1.in" }, 5);
          tl.to(s, { cupSpin: 0.5, duration: 96, ease: "none" }, 4);

          // Scene 2 — the pour (camera rises to look into the cup)
          cam(8, 14, { camX: 0, camY: 6.3, camZ: 4.3, tgtY: 1.95, shiftX: side, shiftY: up });
          tl.to(s, { pour: 1, duration: 27, ease: "none" }, 17.5);
          tl.to(s, { fill: 1, duration: 23, ease: "sine.inOut" }, 20.2);
          caption(1, 16, 40);

          // Scene 3 — the cup settles on its saucer
          cam(44, 15, { camX: 4.5, camY: 2.3, camZ: 6.3, tgtY: 0.8 });
          tl.to(s, { cupY: 0, duration: 11, ease: "power2.in" }, 47);
          tl.to(s, { saucerDip: 0.022, duration: 0.9, ease: "power2.out" }, 58);
          tl.to(s, { saucerDip: 0, duration: 3.2, ease: "elastic.out(1.1, 0.45)" }, 58.9);
          caption(2, 50, 62);

          // Scene 4 — steam and a close look at the crema
          tl.to(s, { steam: 1, duration: 10, ease: "power1.inOut" }, 60);
          tl.to(s, { warmth: 0.55, duration: 14 }, 62);
          cam(62, 15, { camX: 1.5, camY: 3.7, camZ: 3.5, tgtY: 1.1 });
          caption(3, 68, 82);

          // Scene 5 — cinematic reveal
          cam(80, 20, { camX: -0.6, camY: 2.5, camZ: 5.5, tgtY: 1.0, shiftX: 0, shiftY: wide ? -0.14 : -0.12 }, "power1.inOut");
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
      setStatus("ready");

      cleanup = () => {
        ctx.revert();
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointer);
        scene.dispose();
      };
    })().catch(() => setStatus("fallback"));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [rtl]);

  const captionBase =
    "absolute z-30 max-w-md px-6 bottom-[9svh] inset-x-0 text-center lg:text-start lg:px-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:inset-x-auto lg:start-[max(2.5rem,calc((100vw-82rem)/2+2.5rem))] mx-auto lg:mx-0";

  return (
    <section
      ref={rootRef}
      className="on-dark relative h-svh min-h-[560px] overflow-hidden bg-ink text-cream"
      aria-label={`${brand.en} — ${brand.tagline}`}
    >
      {/* Backdrop: espresso darkness that warms up at the end of the scroll */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_42%,#2e1a12_0%,#1b0f0a_45%,#0d0705_100%)]" />
      <div
        data-warm
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_45%,#6b3f24_0%,#3a2318_42%,#1a0e09_100%)] opacity-0"
      />

      {/* Giant wordmark sitting BEHIND the cup */}
      <div aria-hidden="true" data-giant className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="font-display -translate-y-[6svh] text-[21vw] leading-none font-medium tracking-[-0.02em] text-cream/[0.07] select-none lg:text-[17.5vw]">
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

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(8,4,3,0.55)_100%)]" />

      {/* Keeps captions legible where they overlap the saucer */}
      <div
        data-scrim
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[48svh] bg-gradient-to-t from-ink/95 via-ink/55 to-transparent lg:opacity-0"
      />

      {/* Scene 1 — brand introduction (server-rendered, visible before any JS) */}
      <div data-scene="0" className="absolute inset-0 z-30 flex flex-col items-center justify-between px-6 pt-[15svh] pb-[12svh] text-center">
        <div>
          <p className="mb-4 text-sm font-medium text-beige">{rtl ? brand.fa : "Specialty Coffee"}</p>
          <h1 className="font-display text-[clamp(2.1rem,7.4vw,5.6rem)] leading-none font-light tracking-[0.2em]">
            MAMMOTH <span className="text-beige">CAFE</span>
          </h1>
        </div>
        <p className="display-title max-w-[18ch] text-[clamp(1.5rem,3.4vw,2.4rem)] md:max-w-none text-cream">
          {rtl ? `«${t.scenes[0].title}»` : t.scenes[0].title}
        </p>
      </div>

      {t.scenes.slice(1, 4).map((scene, i) => (
        <div key={scene.title} data-scene={i + 1} className={`${captionBase} invisible`}>
          <p className="eyebrow mb-4 text-beige!">{scene.eyebrow}</p>
          <h2 className="display-title text-[clamp(1.9rem,4.6vw,3.6rem)]">{scene.title}</h2>
          <p className="mt-4 text-base leading-loose text-cream/70 lg:text-lg">{scene.body}</p>
        </div>
      ))}

      <div data-scene="4" className="invisible absolute inset-x-0 bottom-[9svh] z-30 flex flex-col items-center px-6 text-center">
        <h2 className="display-title text-[clamp(2rem,5.4vw,4.2rem)]">{t.scenes[4].title}</h2>
        <Link href={localePath(locale, "/menu")} className="btn btn-cream mt-7">
          {t.cta}
          <Arrow className="size-4" />
        </Link>
      </div>

      {/* Scroll hint */}
      <div data-hint aria-hidden="true" className="absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 text-[0.7rem] text-cream/60">
        <span>{t.scroll}</span>
        <span className="block h-9 w-px bg-cream/70 [animation:scroll-hint_2.2s_ease-in-out_infinite]" />
      </div>

      {/* Loading curtain */}
      <div
        className={`hero-loader absolute inset-0 z-40 grid place-items-center bg-ink transition-[opacity,visibility] duration-1000 ${
          status === "loading" ? "visible opacity-100" : "invisible opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-5">
          <LogoMark className="size-16 animate-pulse text-beige" />
          <span className="text-xs text-cream/60">{t.loading}</span>
        </div>
      </div>
    </section>
  );
}
