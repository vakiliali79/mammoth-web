import { en } from "./en";
import { fa, type Dictionary } from "./fa";

export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

export const getDictionary = (locale: Locale): Dictionary => (locale === "en" ? en : fa);

export const dirOf = (locale: Locale) => (locale === "fa" ? "rtl" : "ltr");

/** Persian lives at `/`, English under `/en`. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? "/en" : `/en${clean}`;
}

/** Picks the localized value, falling back to Persian when no English text exists. */
export const pick = (locale: Locale, faText: string, enText: string) =>
  locale === "en" && enText.trim() ? enText : faText;

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(value);
}

/** Converts latin digits in a string (phone numbers, times) to Persian digits for fa. */
export function localizeDigits(value: string, locale: Locale): string {
  if (locale !== "fa") return value;
  return value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export type { Dictionary };
