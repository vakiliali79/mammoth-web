import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-deep/10 pb-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-carbon/65">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-deep/10 bg-white p-5 md:p-6 ${className}`}>{children}</section>;
}
