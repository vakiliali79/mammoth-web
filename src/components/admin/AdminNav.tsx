"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "پیشخوان" },
  { href: "/admin/items", label: "محصولات منو" },
  { href: "/admin/categories", label: "دسته‌بندی‌ها" },
  { href: "/admin/featured", label: "منتخب صفحه اصلی" },
  { href: "/admin/gallery", label: "گالری" },
  { href: "/admin/settings", label: "تماس و ساعات کاری" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="مدیریت" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:pb-0">
      {links.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`block shrink-0 rounded-xl px-4 py-3 text-sm whitespace-nowrap transition-colors ${
              active ? "bg-soft text-deep" : "text-soft/75 hover:bg-soft/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
