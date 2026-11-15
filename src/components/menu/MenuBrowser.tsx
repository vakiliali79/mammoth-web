"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Price } from "@/components/ui/Price";
import { SmartImage } from "@/components/ui/SmartImage";
import type { MenuSection } from "@/lib/data/repository";
import type { MenuItem } from "@/lib/data/types";
import { formatNumber, pick, type Dictionary, type Locale } from "@/lib/i18n";
import { matchesQuery } from "@/lib/search";

interface Props {
  locale: Locale;
  t: Dictionary["menu"];
  sections: MenuSection[];
}

export function MenuBrowser({ locale, t, sections }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(sections[0]?.category.slug ?? "");
  const railRef = useRef<HTMLDivElement>(null);
  // While a chip-triggered smooth scroll is running, the scroll-spy must not fight it.
  const locked = useRef(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          items: s.items.filter((i) =>
            matchesQuery(query, i.nameFa, i.nameEn, i.descriptionFa, i.descriptionEn, s.category.nameFa, s.category.nameEn),
          ),
        }))
        .filter((s) => s.items.length > 0),
    [sections, query],
  );
  const total = filtered.reduce((n, s) => n + s.items.length, 0);
  const searching = query.trim().length > 0;

  // Scroll-spy: the active category is the last section whose top has passed the sticky bar.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (locked.current) return;
      const targets = document.querySelectorAll<HTMLElement>("[data-menu-section]");
      let current = targets[0]?.id ?? "";
      for (const el of targets) if (el.getBoundingClientRect().top <= window.innerHeight * 0.38) current = el.id;
      if (current) setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [filtered.length, searching]);

  // Keep the active chip in view inside the horizontal rail.
  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(active)}"]`);
    if (!rail || !chip) return;
    const target = chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
    rail.scrollTo({ left: target, behavior: "smooth" });
  }, [active]);

  const jump = (slug: string) => {
    setActive(slug);
    locked.current = true;
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => (locked.current = false), 900);
    document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* Sticky tools: search + category rail */}
      <div className="sticky top-16 z-30 border-b border-deep/10 bg-white/95 backdrop-blur-sm md:top-20">
        <div className="container-site flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-8">
          <div className="relative lg:w-80 lg:shrink-0">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-carbon/50 ltr:left-4 rtl:right-4" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              aria-label={t.searchLabel}
              enterKeyHint="search"
              className="h-12 w-full rounded-full border border-deep/15 bg-white/70 px-11 text-[0.95rem] outline-none transition-colors placeholder:text-carbon/45 focus:border-red [&::-webkit-search-cancel-button]:hidden"
            />
            {searching && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t.clear}
                className="absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-carbon/60 hover:text-deep ltr:right-0.5 rtl:left-0.5"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <nav aria-label={t.categories} className="min-w-0 flex-1">
            <div ref={railRef} className="no-scrollbar relative -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
              {filtered.map(({ category }) => {
                const on = active === category.slug;
                return (
                  <button
                    key={category.id}
                    type="button"
                    data-chip={category.slug}
                    aria-current={on ? "true" : undefined}
                    onClick={() => jump(category.slug)}
                    className={`min-h-11 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap transition-colors duration-300 ${
                      on ? "border-deep bg-deep text-soft" : "border-deep/15 text-carbon hover:border-deep/50"
                    }`}
                  >
                    {pick(locale, category.nameFa, category.nameEn)}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      <div className="container-site pt-10 pb-24 md:pb-36">
        <p className="mb-2 text-sm text-carbon/60" role="status" aria-live="polite">
          {searching ? `${formatNumber(total, locale)} ${t.results}` : t.priceNote}
        </p>

        {filtered.length === 0 && (
          <div className="py-28 text-center">
            <p className="display-title text-2xl text-carbon/70">{t.noResults}</p>
            <button type="button" onClick={() => setQuery("")} className="btn btn-dark mt-8">
              {t.clear}
            </button>
          </div>
        )}

        {filtered.map(({ category, items }) => (
          <section key={category.id} id={category.slug} data-menu-section className="scroll-mt-48 pt-14 md:pt-20 lg:scroll-mt-40">
            <header className="mb-8 flex items-end justify-between gap-6 border-b border-deep/15 pb-5">
              <div>
                <h2 className="display-title text-3xl md:text-[2.75rem]">{pick(locale, category.nameFa, category.nameEn)}</h2>
                {locale === "fa" && category.nameEn && (
                  <p className="font-display mt-2 text-sm tracking-[0.2em] text-carbon/70 uppercase">{category.nameEn}</p>
                )}
              </div>
              <span className="font-display text-4xl leading-none font-light text-deep/25 ">
                {String(items.length).padStart(2, "0")}
              </span>
            </header>
            <ul className="grid gap-x-10 gap-y-2 lg:grid-cols-2">
              {items.map((item) => (
                <MenuCard key={item.id} item={item} locale={locale} t={t} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function MenuCard({ item, locale, t }: { item: MenuItem; locale: Locale; t: Dictionary["menu"] }) {
  const name = pick(locale, item.nameFa, item.nameEn);
  const description = pick(locale, item.descriptionFa, item.descriptionEn);
  const off = !item.available;

  return (
    <li
      data-item={item.id}
      data-available={item.available}
      className={`group flex gap-4 border-b border-deep/8 py-5 md:gap-6 ${off ? "opacity-55" : ""}`}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-soft md:size-32">
        {item.image && (
          <SmartImage
            src={item.image}
            alt={name}
            fill
            sizes="(min-width: 768px) 128px, 96px"
            className={`object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.08] ${off ? "grayscale" : ""}`}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold md:text-xl">
              <span className={off ? "line-through decoration-1" : ""}>{name}</span>
              {item.popular && !off && (
                <span className="rounded-full bg-red px-2.5 py-0.5 text-xs font-bold text-white">{t.popular}</span>
              )}
              {off && <span className="rounded-full border border-deep/40 px-2.5 py-0.5 text-xs font-medium">{t.unavailable}</span>}
            </h3>
            {locale === "fa" && item.nameEn && <p className="font-display mt-0.5 text-[0.8rem] tracking-wider text-carbon/70">{item.nameEn}</p>}
          </div>
          {item.variants.length === 0 && <Price value={item.price} locale={locale} unit={t.toman} className="mt-0.5 text-lg" />}
        </div>

        {description && <p className="mt-2 text-sm leading-relaxed text-carbon/70">{description}</p>}

        {item.variants.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            {item.variants.map((v, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="text-carbon/60">{pick(locale, v.labelFa, v.labelEn)}</span>
                <Price value={v.price} locale={locale} unit={t.toman} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
