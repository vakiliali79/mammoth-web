"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/ui/Logo";
import { localePath, type Dictionary, type Locale } from "@/lib/i18n";

interface HeaderProps {
  locale: Locale;
  nav: Dictionary["nav"];
}

export function Header({ locale, nav }: HeaderProps) {
  const pathname = usePathname() || "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const progressRef = useRef<HTMLSpanElement>(null);

  const links = [
    { href: localePath(locale, "/menu"), label: nav.menu },
    { href: `${localePath(locale, "/")}#story`, label: nav.story },
    { href: `${localePath(locale, "/")}#experience`, label: nav.experience },
    { href: `${localePath(locale, "/")}#gallery`, label: nav.gallery },
    { href: `${localePath(locale, "/")}#contact`, label: nav.contact },
  ];

  // Same page in the other language.
  const bare = pathname.replace(/^\/(en|fa)(?=\/|$)/, "") || "/";
  const other: Locale = locale === "fa" ? "en" : "fa";
  const switchHref = localePath(other, bare);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="on-dark fixed inset-x-0 top-0 z-50 text-soft">
      <div
        className={`absolute inset-0 -z-10 transition-opacity duration-500 ${
          scrolled && !open ? "opacity-100" : "opacity-0"
        } border-b border-soft/10 bg-black/92`}
      />
      <div className="container-site flex h-16 items-center justify-between md:h-20">
        <Link href={localePath(locale, "/")} aria-label={`${nav.home} — MAMMOTH CAFE`} onClick={() => setOpen(false)}>
          <Wordmark withFa={locale === "fa"} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-9 text-sm font-medium lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center opacity-85 transition-opacity hover:opacity-100 [&>span]:link-underline">
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={switchHref}
            hrefLang={other}
            lang={other}
            className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium opacity-85 transition-opacity hover:opacity-100 ${
              other === "en" ? "font-display tracking-[0.18em] uppercase" : ""
            }`}
          >
            {nav.language}
          </Link>
          <Link href={localePath(locale, "/menu")} className="btn btn-soft hidden min-h-10 px-5 py-2 text-sm sm:inline-flex lg:hidden xl:inline-flex">
            {nav.menu}
          </Link>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? nav.close : nav.open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <MenuIcon className="size-6" />}
          </button>
        </div>
      </div>

      {/* Reading progress */}
      <span
        ref={progressRef}
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 block h-0.5 origin-right scale-x-0 bg-red ltr:origin-left"
      />

      {/* Mobile navigation */}
      <div
        id="mobile-nav"
        className={`fixed inset-0 -z-20 bg-black transition-[opacity,visibility] duration-500 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav aria-label="Mobile" className="container-site flex h-full flex-col justify-center gap-2 pt-16">
          {[{ href: localePath(locale, "/"), label: nav.home }, ...links].map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className={`display-title border-b border-soft/10 py-4 text-3xl transition-[opacity,transform] duration-700 ease-out-expo ${
                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
              style={{ transitionDelay: open ? `${80 + i * 55}ms` : "0ms" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
