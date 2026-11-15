import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Dictionary } from "@/lib/i18n";

export function Intro({ t }: { t: Dictionary["intro"] }) {
  return (
    <section id="story" className="relative bg-white py-24 md:py-40">
      <div className="container-site grid items-center gap-16 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <Reveal as="p" className="eyebrow mb-6">
            {t.eyebrow}
          </Reveal>
          <Reveal as="h2" delay={80} className="display-title text-[clamp(2.5rem,6.2vw,5.25rem)]">
            {t.title}
          </Reveal>
          <Reveal as="p" delay={160} className="mt-9 max-w-xl text-xl leading-[2] font-medium text-carbon md:text-2xl md:leading-[1.9]">
            {t.lead}
          </Reveal>
          <Reveal as="p" delay={220} className="mt-6 max-w-xl leading-[2.1] text-carbon/75">
            {t.body}
          </Reveal>
          <Reveal delay={280} className="mt-10 flex items-center gap-4 text-deep">
            <span className="h-0.5 w-12 bg-red" />
            <span className="text-lg font-semibold">{t.signature}</span>
          </Reveal>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:col-span-5 lg:col-start-8 lg:max-w-none">
          <Reveal variant="image" className="parallax relative aspect-[4/5] overflow-hidden rounded-t-[10rem] rounded-b-3xl">
            <SmartImage
              src="/images/editorial/latte-art-pour.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 38vw, 92vw"
              className="object-cover"
            />
          </Reveal>
          <Reveal
            variant="image"
            delay={200}
            className="parallax absolute -bottom-10 aspect-square w-[42%] overflow-hidden rounded-3xl border-[6px] border-white sm:border-8 ltr:-left-2 rtl:-right-2 sm:ltr:-left-8 sm:rtl:-right-8 lg:ltr:-left-14 lg:rtl:-right-14"
          >
            <SmartImage src="/images/editorial/beans.jpg" alt="" fill sizes="(min-width: 1024px) 16vw, 40vw" className="object-cover" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
