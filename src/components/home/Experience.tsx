import { Reveal } from "@/components/ui/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Dictionary } from "@/lib/i18n";

const images = ["/images/editorial/tools.jpg", "/images/editorial/pour-over.jpg", "/images/editorial/interior.jpg"];

export function Experience({ t }: { t: Dictionary["experience"] }) {
  return (
    <section id="experience" className="bg-cream py-24 md:py-40">
      <div className="container-site">
        <div className="mx-auto mb-20 max-w-3xl text-center md:mb-32">
          <Reveal as="p" className="eyebrow mb-5 after:h-px after:w-8 after:bg-current after:opacity-70 after:content-['']">
            {t.eyebrow}
          </Reveal>
          <Reveal as="h2" delay={80} className="display-title text-[clamp(2.5rem,6vw,5rem)]">
            {t.title}
          </Reveal>
        </div>

        <div className="space-y-24 md:space-y-40">
          {t.chapters.map((chapter, i) => (
            <article key={chapter.no} className="grid items-center gap-10 md:grid-cols-12">
              <Reveal
                variant="image"
                className={`parallax relative aspect-[5/4] overflow-hidden rounded-3xl md:col-span-7 ${i % 2 ? "md:order-2 md:col-start-6" : ""}`}
              >
                <SmartImage src={images[i]} alt="" fill sizes="(min-width: 768px) 56vw, 92vw" className="object-cover" />
              </Reveal>
              <div className={`md:col-span-4 ${i % 2 ? "md:order-1 md:col-start-1" : "md:col-start-9"}`}>
                <Reveal className="flex items-baseline gap-4 text-caramel">
                  <span className="font-display text-7xl leading-none font-light md:text-8xl">{chapter.no}</span>
                  <span className="text-sm font-medium">{chapter.label}</span>
                </Reveal>
                <Reveal as="h3" delay={90} className="display-title mt-6 text-3xl md:text-[2.6rem]">
                  {chapter.title}
                </Reveal>
                <Reveal as="p" delay={160} className="mt-5 leading-[2.1] text-chocolate/75">
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
