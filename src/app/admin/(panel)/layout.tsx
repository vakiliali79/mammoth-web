import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "../actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/ui/Logo";
import { requireAdmin } from "@/lib/auth/session";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="on-dark bg-ink text-cream lg:sticky lg:top-0 lg:h-svh">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:py-7">
          <Link href="/admin" className="flex items-center gap-3">
            <LogoMark className="size-8 text-beige" />
            <span>
              <span className="font-display block text-sm tracking-[0.25em]">MAMMOTH</span>
              <span className="text-xs text-cream/60">پنل مدیریت</span>
            </span>
          </Link>
          <form action={logoutAction} className="lg:hidden">
            <button className="rounded-lg border border-cream/20 px-3 py-1.5 text-xs">خروج</button>
          </form>
        </div>
        <AdminNav />
        <div className="hidden px-5 py-6 text-sm lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="mb-3 text-xs text-cream/50" dir="ltr">
            {session.username}
          </p>
          <div className="flex items-center gap-3">
            <form action={logoutAction}>
              <button className="rounded-lg border border-cream/20 px-3 py-1.5 text-xs hover:border-cream/60">خروج</button>
            </form>
            <Link href="/" target="_blank" className="text-xs text-cream/60 hover:text-cream">
              مشاهده سایت ↗
            </Link>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
