import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/PageHeader";
import { getSiteData } from "@/lib/data/repository";
import { formatNumber } from "@/lib/i18n";

export default async function Dashboard() {
  const data = await getSiteData();
  const { contact } = data.settings;
  const missing = [
    !contact.addressFa && "نشانی",
    !contact.phone && "تلفن",
    !contact.instagram && "اینستاگرام",
    data.settings.hours.length === 0 && "ساعات کاری",
  ].filter(Boolean);

  const stats = [
    { label: "محصول", value: data.items.length, href: "/admin/items" },
    { label: "ناموجود", value: data.items.filter((i) => !i.available).length, href: "/admin/items" },
    { label: "دسته‌بندی", value: data.categories.length, href: "/admin/categories" },
    { label: "منتخب صفحه اصلی", value: data.featuredIds.length, href: "/admin/featured" },
    { label: "تصویر گالری", value: data.gallery.length, href: "/admin/gallery" },
  ];

  return (
    <>
      <PageHeader title="پیشخوان" description="مدیریت منو، تصاویر و اطلاعات تماس کافه ماموت." />

      {data.settings.demoMode && (
        <Card className="mb-6 border-red/40 bg-soft/60">
          <h2 className="font-bold">سایت در حالت نمایشی است</h2>
          <p className="mt-2 text-sm leading-relaxed text-carbon/75">
            محصولات و قیمت‌های فعلی داده نمونه هستند. پس از وارد کردن منوی واقعی، حالت نمایشی را از بخش «تماس و ساعات کاری» خاموش کنید تا
            برچسب «نسخه نمایشی» از سایت حذف شود.
          </p>
        </Card>
      )}
      {missing.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-bold">اطلاعات تکمیل‌نشده</h2>
          <p className="mt-2 text-sm text-carbon/75">
            هنوز وارد نشده: {missing.join("، ")}.{" "}
            <Link href="/admin/settings" className="inline-block py-2 font-semibold text-carbon underline decoration-red decoration-2 underline-offset-4">
              تکمیل اطلاعات
            </Link>
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border border-deep/10 bg-white p-5 transition-colors hover:border-red">
            <p className="text-3xl font-extrabold">{formatNumber(s.value, "fa")}</p>
            <p className="mt-1 text-sm text-carbon/65">{s.label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
