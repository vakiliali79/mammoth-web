import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { fraunces, vazir } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "مدیریت | کافه ماموت", template: "%s | مدیریت ماموت" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${fraunces.variable}`}>
      <body className="min-h-svh bg-offwhite">{children}</body>
    </html>
  );
}
