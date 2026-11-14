import Link from "next/link";
import { deleteItemAction } from "../../actions";
import { ConfirmSubmit, inputClass } from "@/components/admin/forms";
import { PriceForm, ToggleForm } from "@/components/admin/ItemControls";
import { PageHeader } from "@/components/admin/PageHeader";
import { getSiteData } from "@/lib/data/repository";
import { matchesQuery } from "@/lib/search";

export const metadata = { title: "محصولات" };

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; saved?: string }> }) {
  const { q = "", cat = "", saved } = await searchParams;
  const data = await getSiteData();
  const categoryName = new Map(data.categories.map((c) => [c.id, c.nameFa]));
  const items = data.items.filter((i) => (!cat || i.categoryId === cat) && matchesQuery(q, i.nameFa, i.nameEn));

  return (
    <>
      <PageHeader
        title="محصولات منو"
        description="افزودن، ویرایش، تغییر قیمت و فعال یا غیرفعال کردن محصولات."
        action={
          <Link href="/admin/items/new" className="btn btn-dark">
            + محصول جدید
          </Link>
        }
      />

      {saved && (
        <p role="status" data-form-message="ok" className="mb-5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          محصول ذخیره شد.
        </p>
      )}

      <form method="get" className="mb-6 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="جستجوی نام محصول…" aria-label="جستجو" className={`${inputClass} max-w-xs`} />
        <select name="cat" defaultValue={cat} aria-label="دسته‌بندی" className={`${inputClass} max-w-56`}>
          <option value="">همه دسته‌ها</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameFa}
            </option>
          ))}
        </select>
        <button className="btn btn-outline min-h-11 px-5 py-2">فیلتر</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-espresso/10 bg-white">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-cream/60 text-xs text-chocolate/70">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium">
              <th>محصول</th>
              <th>دسته</th>
              <th>قیمت (تومان)</th>
              <th>موجود</th>
              <th>محبوب</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} data-item-row={item.id} className="border-t border-espresso/8 [&>td]:px-4 [&>td]:py-3">
                <td>
                  <div className="flex items-center gap-3">
                    <span className="block size-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail */}
                      {item.image && <img src={item.image} alt="" loading="lazy" className="size-full object-cover" />}
                    </span>
                    <span>
                      <span className="block font-semibold">{item.nameFa}</span>
                      <span className="block text-xs text-chocolate/55" dir="ltr">
                        {item.nameEn}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="text-chocolate/75">{categoryName.get(item.categoryId) ?? "—"}</td>
                <td>
                  <PriceForm id={item.id} price={item.price} />
                  {item.variants.length > 0 && <span className="mt-1 block text-xs text-chocolate/50">دارای {item.variants.length} اندازه (در صفحه ویرایش)</span>}
                </td>
                <td>
                  <ToggleForm id={item.id} field="available" value={item.available} label={`موجود بودن ${item.nameFa}`} />
                </td>
                <td>
                  <ToggleForm id={item.id} field="popular" value={item.popular} label={`محبوب بودن ${item.nameFa}`} />
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/items/${item.id}`} className="rounded-lg px-3 py-2 text-sm hover:bg-cream">
                      ویرایش
                    </Link>
                    <form action={deleteItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <ConfirmSubmit message={`«${item.nameFa}» حذف شود؟`}>حذف</ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-chocolate/60">
                  محصولی پیدا نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
