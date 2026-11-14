import Link from "next/link";
import { headers } from "next/headers";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";

export const metadata = { title: "404", robots: { index: false } };

export default async function NotFound() {
  // not-found receives no params; infer the language from the requested URL.
  const h = await headers();
  const path = h.get("x-mammoth-path") ?? "";
  const locale: Locale = path === "/en" || path.startsWith("/en/") ? "en" : "fa";
  const t = getDictionary(locale);

  return (
    <section className="on-dark grain relative grid min-h-svh place-items-center overflow-hidden bg-ink px-6 text-center text-cream">
      <div className="relative z-10">
        <div className="relative mx-auto mb-10 w-fit" aria-hidden="true">
          <span className="font-display block text-[clamp(7rem,26vw,16rem)] leading-none font-light text-cream/10">
            {t.notFound.code}
          </span>
          {/* an empty cup */}
          <svg viewBox="0 0 120 90" className="absolute inset-0 m-auto w-28 text-beige md:w-36" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M22 22h62c0 30-10 46-31 46S22 52 22 22Z" />
            <path d="M84 30c14-3 20 6 16 15-3 7-12 10-22 9" />
            <path d="M14 78h78" />
          </svg>
        </div>
        <h1 className="display-title text-4xl md:text-6xl">{t.notFound.title}</h1>
        <p className="mx-auto mt-5 max-w-md text-cream/65">{t.notFound.body}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={localePath(locale, "/")} className="btn btn-cream">
            {t.notFound.home}
          </Link>
          <Link href={localePath(locale, "/menu")} className="btn btn-outline">
            {t.notFound.menu}
          </Link>
        </div>
      </div>
    </section>
  );
}
