import Link from "next/link";
import { Instagram } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/Logo";
import { localePath, localizeDigits, pick, type Dictionary, type Locale } from "@/lib/i18n";
import type { SiteSettings } from "@/lib/data/types";

export function Footer({ locale, t, settings }: { locale: Locale; t: Dictionary; settings: SiteSettings }) {
  const { contact } = settings;
  const home = localePath(locale, "/");
  const links = [
    { href: home, label: t.nav.home },
    { href: localePath(locale, "/menu"), label: t.nav.menu },
    { href: `${home}#story`, label: t.nav.story },
    { href: `${home}#experience`, label: t.nav.experience },
    { href: `${home}#gallery`, label: t.nav.gallery },
    { href: `${home}#contact`, label: t.nav.contact },
  ];
  const address = pick(locale, contact.addressFa, contact.addressEn);
  const year = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : "en-US", { year: "numeric" }).format(new Date());

  return (
    <footer className="on-dark grain relative overflow-hidden bg-black text-soft">
      <div className="container-site relative z-10 pt-20 pb-10 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-6">
            <LogoMark className="size-12 text-sky" />
            <p className="font-display mt-6 text-[clamp(2.6rem,7vw,5.5rem)] leading-none font-light tracking-[0.08em] rtl:text-right">
              MAMMOTH <span className="text-red">CAFE</span>
            </p>
            <p className="mt-4 text-lg text-soft/60">
              {locale === "fa" ? `کافه ماموت — ${t.footer.line}` : t.footer.line}
            </p>
          </div>

          <nav aria-label={t.footer.nav} className="md:col-span-3">
            <h2 className="mb-5 text-sm font-medium text-sky">{t.footer.nav}</h2>
            <ul className="text-soft/75">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-10 items-center hover:text-soft [&>span]:link-underline">
                    <span>{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <h2 className="mb-5 text-sm font-medium text-sky">{t.footer.contact}</h2>
            <ul className="space-y-3 text-soft/75">
              <li>{address || t.contact.pending}</li>
              {contact.phone && (
                <li>
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="link-underline hover:text-soft">
                    {localizeDigits(contact.phone, locale)}
                  </a>
                </li>
              )}
              {contact.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${contact.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-soft"
                  >
                    <Instagram className="size-4" />
                    <span dir="ltr">@{contact.instagram}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {settings.demoMode && (
          <p role="note" data-demo-note className="mt-14 rounded-2xl border border-sky/25 px-5 py-3 text-xs leading-relaxed text-sky">
            {t.demo}
          </p>
        )}

        <div className="mt-10 flex flex-col gap-3 border-t border-soft/10 pt-6 text-xs text-soft/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {locale === "fa" ? "کافه ماموت" : "Mammoth Cafe"}. {t.footer.rights}
          </p>
          <p className="font-display tracking-[0.3em] uppercase">Mammoth Cafe</p>
        </div>
      </div>
    </footer>
  );
}
