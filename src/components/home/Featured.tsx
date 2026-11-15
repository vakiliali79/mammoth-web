import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Price } from "@/components/ui/Price";
import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Category, MenuItem } from "@/lib/data/types";
import { localePath, pick, type Dictionary, type Locale } from "@/lib/i18n";

interface FeaturedProps {
  locale: Locale;
  t: Dictionary;
  items: (MenuItem & { category: Category })[];
}

export function Featured({ locale, t, items }: FeaturedProps) {
  if (items.length === 0) return null;
  const Arrow = locale === "fa" ? ArrowLeft : ArrowRight;

  return (
    <section className="on-dark grain relative overflow-hidden bg-deep py-24 text-soft md:py-36">
      <div className="container-site relative z-10">
        <div className="mb-14 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal as="p" className="eyebrow mb-5 text-sky!">
              {t.featured.eyebrow}
            </Reveal>
            <Reveal as="h2" delay={80} className="display-title text-[clamp(2.25rem,5.4vw,4.5rem)]">
              {t.featured.title}
            </Reveal>
            <Reveal as="p" delay={140} className="mt-4 text-soft/60">
              {t.featured.body}
            </Reveal>
          </div>
          <Reveal delay={200}>
            <Link href={localePath(locale, "/menu")} className="btn btn-outline group">
              {t.featured.link}
              <Arrow className="size-4 transition-transform duration-300 group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
            </Link>
          </Reveal>
        </div>

        {/* Phones: one swipeable row (keeps the section about one screen tall). Tablets and up: grid. */}
        <ul className="snap-rail -mx-5 gap-4 px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal as="li" key={item.id} delay={(i % 3) * 110} className="w-[76vw] max-w-xs sm:w-auto sm:max-w-none">
              <Link href={`${localePath(locale, "/menu")}#${item.category.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-carbon">
                  {item.image && (
                    <SmartImage
                      src={item.image}
                      alt={pick(locale, item.nameFa, item.nameEn)}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 76vw"
                      className="object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.06]"
                    />
                  )}
                  <span className="absolute top-4 rounded-full bg-black/75 px-3.5 py-1.5 text-xs text-soft ltr:left-4 rtl:right-4">
                    {pick(locale, item.category.nameFa, item.category.nameEn)}
                  </span>
                </div>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{pick(locale, item.nameFa, item.nameEn)}</h3>
                    {locale === "fa" && item.nameEn && (
                      <p className="font-display mt-1 text-sm tracking-wider text-sky">{item.nameEn}</p>
                    )}
                  </div>
                  <Price value={item.price} locale={locale} unit={t.menu.toman} className="mt-1 text-sky" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-soft/60">{pick(locale, item.descriptionFa, item.descriptionEn)}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
