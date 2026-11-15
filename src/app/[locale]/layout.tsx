import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getSettings } from "@/lib/data/repository";
import { fraunces, vazir } from "@/lib/fonts";
import { dirOf, getDictionary, isLocale, localePath, pick, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";

// Content comes from the admin-editable data store, so render per request.
export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

const asLocale = (value: string): Locale => (isLocale(value) ? value : "fa");

export const viewport: Viewport = {
  themeColor: "#080b0f",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.meta.title, template: locale === "fa" ? "%s | کافه ماموت" : "%s | MAMMOTH CAFE" },
    description: t.meta.description,
    applicationName: "MAMMOTH CAFE",
    keywords:
      locale === "fa"
        ? ["کافه ماموت", "ماموت", "کافه", "قهوه", "قهوه تخصصی", "اسپرسو", "منوی کافه", "Mammoth Cafe"]
        : ["Mammoth Cafe", "cafe", "coffee", "specialty coffee", "espresso", "کافه ماموت"],
    alternates: {
      canonical: localePath(locale, "/"),
      languages: { fa: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: "MAMMOTH CAFE | کافه ماموت",
      title: t.meta.title,
      description: t.meta.description,
      url: localePath(locale, "/"),
      locale: locale === "fa" ? "fa_IR" : "en_US",
      alternateLocale: locale === "fa" ? "en_US" : "fa_IR",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "MAMMOTH CAFE" }],
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description, images: ["/og.jpg"] },
    icons: { icon: "/icon.svg" },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Params }) {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale);
  const settings = await getSettings();
  const { contact } = settings;

  // schema.org structured data — only real, configured values are emitted.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: "MAMMOTH CAFE",
    alternateName: "کافه ماموت",
    url: siteUrl(),
    image: `${siteUrl()}/og.jpg`,
    servesCuisine: "Coffee",
    hasMenu: `${siteUrl()}${localePath(locale, "/menu")}`,
    priceRange: "$$",
  };
  const address = pick(locale, contact.addressFa, contact.addressEn);
  if (address) jsonLd.address = { "@type": "PostalAddress", streetAddress: address, addressCountry: "IR" };
  if (contact.phone) jsonLd.telephone = contact.phone;
  if (contact.email) jsonLd.email = contact.email;
  if (contact.instagram) jsonLd.sameAs = [`https://instagram.com/${contact.instagram}`];
  if (contact.latitude !== null && contact.longitude !== null)
    jsonLd.geo = { "@type": "GeoCoordinates", latitude: contact.latitude, longitude: contact.longitude };
  const open = settings.hours.filter((h) => !h.closed);
  if (open.length)
    jsonLd.openingHours = open.map((h) => `${pick("en", h.daysFa, h.daysEn)} ${h.open}-${h.close}`);

  return (
    <html lang={locale} dir={dirOf(locale)} className={`${vazir.variable} ${fraunces.variable}`}>
      <body>
        <noscript>
          <style>{`.reveal,.reveal-image{opacity:1!important;transform:none!important;clip-path:none!important}.hero-loader{display:none!important}`}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:z-[100] focus:rounded-full focus:bg-soft focus:px-5 focus:py-3 focus:text-deep ltr:focus:left-3 rtl:focus:right-3"
        >
          {t.nav.skip}
        </a>
        <Header locale={locale} nav={t.nav} />
        <main id="main">{children}</main>
        <Footer locale={locale} t={t} settings={settings} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
