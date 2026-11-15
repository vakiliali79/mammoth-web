import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Instagram } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/Reveal";
import type { SiteSettings } from "@/lib/data/types";
import { localizeDigits, pick, type Dictionary, type Locale } from "@/lib/i18n";
import type { ReactNode } from "react";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-5 border-t border-deep/12 py-6">
      <span className="mt-1 text-red">{icon}</span>
      <div>
        <dt className="mb-1.5 text-sm text-carbon/60">{label}</dt>
        <dd className="text-lg leading-relaxed font-medium">{children}</dd>
      </div>
    </div>
  );
}

export function Contact({ locale, t, settings }: { locale: Locale; t: Dictionary["contact"]; settings: SiteSettings }) {
  const { contact, hours } = settings;
  const address = pick(locale, contact.addressFa, contact.addressEn);
  const pending = <span className="text-carbon/45">{t.pending}</span>;
  const hasMap = contact.latitude !== null && contact.longitude !== null;
  const d = 0.004;
  const embed = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${contact.longitude! - d}%2C${contact.latitude! - d}%2C${contact.longitude! + d}%2C${contact.latitude! + d}&layer=mapnik&marker=${contact.latitude}%2C${contact.longitude}`
    : null;

  return (
    <section id="contact" className="bg-white py-24 md:py-36">
      <div className="container-site grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal as="p" className="eyebrow mb-5">
            {t.eyebrow}
          </Reveal>
          <Reveal as="h2" delay={80} className="display-title mb-10 text-[clamp(2.25rem,5.4vw,4.5rem)]">
            {t.title}
          </Reveal>
          <Reveal as="dl" delay={160}>
            <Row icon={<MapPin className="size-5" />} label={t.address}>
              {address || pending}
            </Row>
            <Row icon={<Phone className="size-5" />} label={t.phone}>
              {contact.phone ? (
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="link-underline">
                  {localizeDigits(contact.phone, locale)}
                </a>
              ) : (
                pending
              )}
            </Row>
            <Row icon={<Instagram className="size-5" />} label={t.instagram}>
              {contact.instagram ? (
                <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer" dir="ltr" className="link-underline">
                  @{contact.instagram}
                </a>
              ) : (
                pending
              )}
            </Row>
            {contact.email && (
              <Row icon={<Mail className="size-5" />} label={t.email}>
                <a href={`mailto:${contact.email}`} dir="ltr" className="link-underline">
                  {contact.email}
                </a>
              </Row>
            )}
            <Row icon={<Clock className="size-5" />} label={t.hours}>
              {hours.length ? (
                <ul className="space-y-1.5 text-base">
                  {hours.map((h, i) => (
                    <li key={i} className="flex flex-wrap gap-x-4">
                      <span className="min-w-36">{pick(locale, h.daysFa, h.daysEn)}</span>
                      <span className="text-carbon/70">
                        {h.closed ? t.closed : <span dir="ltr">{localizeDigits(`${h.open} – ${h.close}`, locale)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                pending
              )}
            </Row>
          </Reveal>
          {contact.mapUrl && (
            <Reveal delay={220} className="mt-4">
              <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
                <MapPin className="size-4" />
                {t.openMap}
              </a>
            </Reveal>
          )}
        </div>

        <Reveal variant="image" className="relative min-h-[22rem] overflow-hidden rounded-3xl bg-soft lg:col-span-7 lg:min-h-[34rem]">
          {embed ? (
            <iframe
              src={embed}
              title={t.mapTitle}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="absolute inset-0 size-full border-0"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center">
              {/* decorative street grid until a real location is configured */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-50 [background-image:linear-gradient(#a9d5e8aa_1px,transparent_1px),linear-gradient(90deg,#a9d5e8aa_1px,transparent_1px)] [background-size:3.5rem_3.5rem] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"
              />
              <div className="relative">
                <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-deep text-soft">
                  <MapPin className="size-7" />
                </span>
                <p className="max-w-xs text-carbon/70">{t.mapPending}</p>
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
