import { formatNumber, type Locale } from "@/lib/i18n";

export function Price({ value, locale, unit, className = "" }: { value: number; locale: Locale; unit: string; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 whitespace-nowrap ${className}`}>
      <span className="font-semibold">{formatNumber(value, locale)}</span>
      <span className="text-[0.72em] opacity-60">{unit}</span>
    </span>
  );
}
