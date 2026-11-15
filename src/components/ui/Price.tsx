import { formatNumber, type Locale } from "@/lib/i18n";

export function Price({ value, locale, unit, className = "" }: { value: number; locale: Locale; unit: string; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 whitespace-nowrap ${className}`}>
      <span className="font-semibold">{formatNumber(value, locale)}</span>
      <span className="text-[max(0.72em,0.75rem)] opacity-70">{unit}</span>
    </span>
  );
}
