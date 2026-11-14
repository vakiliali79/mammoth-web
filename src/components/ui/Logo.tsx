/** Brand mark: a pair of mammoth tusks that also reads as a cup. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <path d="M16 6C5 11 3.5 29 15 32.5c3 .9 5-1 4.200-3.800" />
        <path d="M24 6C35 11 36.5 29 25 32.5c-3 .9-5-1-4.200-3.800" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "", withFa = true }: { className?: string; withFa?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark className="size-8 shrink-0 text-beige" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-medium tracking-[0.28em]">MAMMOTH</span>
        {withFa && <span className="mt-1.5 text-[0.7rem] font-medium opacity-70">کافه ماموت</span>}
      </span>
    </span>
  );
}
