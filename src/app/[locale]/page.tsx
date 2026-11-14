import { HeroExperience } from "@/components/hero/HeroExperience";
import { Contact } from "@/components/home/Contact";
import { Experience } from "@/components/home/Experience";
import { Featured } from "@/components/home/Featured";
import { Gallery } from "@/components/home/Gallery";
import { Intro } from "@/components/home/Intro";
import { getFeaturedItems, getSiteData } from "@/lib/data/repository";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "fa";
  const t = getDictionary(locale);
  const [data, featured] = await Promise.all([getSiteData(), getFeaturedItems()]);

  return (
    <>
      <HeroExperience locale={locale} t={t.hero} brand={t.brand} />
      <Intro t={t.intro} />
      <Featured locale={locale} t={t} items={featured} />
      <Experience t={t.experience} />
      <Gallery locale={locale} t={t.gallery} images={data.gallery} />
      <Contact locale={locale} t={t.contact} settings={data.settings} />
    </>
  );
}
