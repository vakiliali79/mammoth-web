"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import type { GalleryImage } from "@/lib/data/types";
import { pick, type Dictionary, type Locale } from "@/lib/i18n";

const spans: Record<GalleryImage["size"], string> = {
  normal: "",
  wide: "col-span-2",
  tall: "row-span-2",
};

export function Gallery({ locale, t, images }: { locale: Locale; t: Dictionary["gallery"]; images: GalleryImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const count = images.length;

  const step = useCallback((delta: number) => setActive((i) => (i === null ? i : (i + delta + count) % count)), [count]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active !== null && !dialog.open) dialog.showModal();
    if (active === null && dialog.open) dialog.close();
  }, [active]);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(locale === "fa" ? -1 : 1);
      if (e.key === "ArrowLeft") step(locale === "fa" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, step, locale]);

  if (count === 0) return null;
  const current = active !== null ? images[active] : null;

  return (
    <section id="gallery" className="on-dark bg-carbon py-24 text-soft md:py-36">
      <div className="container-site">
        <div className="mb-14 md:mb-20">
          <Reveal as="p" className="eyebrow mb-5 text-sky!">
            {t.eyebrow}
          </Reveal>
          <Reveal as="h2" delay={80} className="display-title text-[clamp(2.25rem,5.4vw,4.5rem)]">
            {t.title}
          </Reveal>
          <Reveal as="p" delay={140} className="mt-4 text-soft/60">
            {t.body}
          </Reveal>
        </div>

        <ul className="grid auto-rows-[42vw] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[22vw] sm:grid-cols-4 md:gap-4 lg:auto-rows-[min(17rem,20vw)]">
          {images.map((image, i) => {
            const alt = pick(locale, image.altFa, image.altEn);
            return (
              <Reveal as="li" key={image.id} delay={(i % 4) * 70} className={spans[image.size]}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`${t.open}${alt ? `: ${alt}` : ""}`}
                  className="group relative block size-full cursor-zoom-in overflow-hidden rounded-2xl bg-deep"
                >
                  <SmartImage
                    src={image.src}
                    alt={alt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.07]"
                  />
                  <span className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/20" />
                </button>
              </Reveal>
            );
          })}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        onClick={(e) => e.target === e.currentTarget && setActive(null)}
        className="on-dark m-0 size-full max-h-none max-w-none bg-black/95 text-soft backdrop:bg-black/80 open:grid open:place-items-center"
      >
        {current && (
          <figure className="relative flex size-full flex-col items-center justify-center gap-5 px-4 pt-20 pb-6 md:px-12">
            {/* Intrinsic sizing: the image is as large as fits, and the controls sit right under it. */}
            <SmartImage
              key={current.id}
              src={current.src}
              alt={pick(locale, current.altFa, current.altEn)}
              width={1600}
              height={1200}
              sizes="100vw"
              className="page-enter h-auto max-h-[calc(100svh-13rem)] w-auto max-w-full rounded-xl object-contain"
            />
            <figcaption className="flex w-full max-w-md items-center justify-between gap-4 text-sm text-soft/80">
              <button type="button" onClick={() => step(-1)} aria-label={t.prev} className="grid size-12 shrink-0 place-items-center rounded-full border border-soft/30 hover:border-soft">
                {locale === "fa" ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
              </button>
              <span className="min-w-0 flex-1 text-center">{pick(locale, current.altFa, current.altEn)}</span>
              <button type="button" onClick={() => step(1)} aria-label={t.next} className="grid size-12 shrink-0 place-items-center rounded-full border border-soft/30 hover:border-soft">
                {locale === "fa" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
              </button>
            </figcaption>
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label={t.close}
              className="absolute top-4 grid size-12 place-items-center rounded-full bg-soft text-deep ltr:right-4 rtl:left-4"
            >
              <X className="size-5" />
            </button>
          </figure>
        )}
      </dialog>
    </section>
  );
}
