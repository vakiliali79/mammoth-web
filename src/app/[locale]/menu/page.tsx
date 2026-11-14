import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { getPublicMenu, getSettings } from "@/lib/data/repository";
import { getDictionary, isLocale, localePath, type Locale } from "@/lib/i18n";

type Params = Promise<{ locale: string }>;
const asLocale = (v: string): Locale => (isLocale(v) ? v : "fa");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale);
  return {
    title: t.meta.menuTitle,
    description: t.meta.menuDescription,
    alternates: { canonical: localePath(locale, "/menu"), languages: { fa: "/menu", en: "/en/menu", "x-default": "/menu" } },
    openGraph: { title: `${t.meta.menuTitle} | MAMMOTH CAFE`, description: t.meta.menuDescription, url: localePath(locale, "/menu"), images: ["/og.jpg"] },
  };
}

export default async function MenuPage({ params }: { params: Params }) {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale);
  const [sections, settings] = await Promise.all([getPublicMenu(), getSettings()]);

  return (
    <>
      <header className="on-dark grain relative overflow-hidden bg-ink pt-36 pb-16 text-cream md:pt-48 md:pb-24">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(90%_120%_at_80%_0%,#3a2318_0%,transparent_60%)]" />
        <div className="container-site relative z-10">
          <p className="eyebrow mb-5 text-beige!">{t.menu.eyebrow}</p>
          <h1 className="display-title text-[clamp(2.75rem,8vw,6.5rem)]">{t.menu.title}</h1>
          <p className="mt-5 max-w-xl text-lg text-cream/65">{t.menu.body}</p>
          {settings.demoMode && (
            <p role="note" data-demo-note className="mt-8 inline-block rounded-2xl border border-beige/30 px-5 py-3 text-xs leading-relaxed text-beige">
              {t.demo}
            </p>
          )}
        </div>
      </header>
      <MenuBrowser locale={locale} t={t.menu} sections={sections} />
    </>
  );
}
