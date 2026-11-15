import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Dictionary } from "@/lib/i18n";

const images = ["/images/editorial/tools.jpg", "/images/editorial/pour-over.jpg", "/images/editorial/interior.jpg"];

export function Experience({ t }: { t: Dictionary["experience"] }) {
  return (
    <section id="experience" className="bg-soft py-24 md:py-40">
      <div className="container-site">
        <div className="mx-auto mb-14 max-w-3xl text-center md:mb-24 lg:mb-32">
          <Reveal as="p" className="eyebrow mb-5 after:h-0.5 after:w-8 after:bg-red after:content-['']">
            {t.eyebrow}
          </Reveal>
          <Reveal as="h2" delay={80} className="display-title text-[clamp(2.5rem,6vw,5rem)]">
            {t.title}
          </Reveal>
        </div>

        <div className="space-y-20 md:space-y-28 lg:space-y-40">
          {t.chapters.map((chapter, i) => (
            <article key={chapter.no} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
              <Reveal
                variant="image"
                className={`parallax relative aspect-[5/4] overflow-hidden rounded-3xl md:max-lg:aspect-[16/9] lg:col-span-7 ${i % 2 ? "lg:order-2 lg:col-start-6" : ""}`}
              >
                <SmartImage src={images[i]} alt="" fill sizes="(min-width: 1024px) 56vw, 92vw" className="object-cover" />
              </Reveal>
              <div className={`lg:col-span-4 ${i % 2 ? "lg:order-1 lg:col-start-1" : "lg:col-start-9"}`}>
                <Reveal className="flex items-baseline gap-4 text-red">
                  <span className="font-display text-7xl leading-none font-light md:text-8xl">{chapter.no}</span>
                  <span className="text-sm font-semibold text-carbon">{chapter.label}</span>
                </Reveal>
                <Reveal as="h3" delay={90} className="display-title mt-6 text-3xl md:text-[2.6rem]">
                  {chapter.title}
                </Reveal>
                <Reveal as="p" delay={160} className="mt-5 leading-[2.1] text-carbon/75">
                  {chapter.body}
                </Reveal>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
