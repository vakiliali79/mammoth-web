import { saveFeaturedAction } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader } from "@/components/admin/PageHeader";
import { getSiteData } from "@/lib/data/repository";

export const metadata = { title: "منتخب صفحه اصلی" };

export default async function FeaturedPage() {
  const data = await getSiteData();
  return (
    <>
      <PageHeader
        title="محصولات منتخب صفحه اصلی"
        description="محصولاتی که در بخش «انتخاب‌های ماموت» صفحه اصلی نمایش داده می‌شوند (حداکثر ۱۲ مورد). با عدد ترتیب، جای آن‌ها را مشخص کنید."
      />
      <ActionForm action={saveFeaturedAction} className="max-w-3xl space-y-6">
        {data.categories.map((category) => {
          const items = data.items.filter((i) => i.categoryId === category.id);
          if (!items.length) return null;
          return (
            <fieldset key={category.id} className="rounded-2xl border border-espresso/10 bg-white p-5">
              <legend className="px-2 text-sm font-bold">{category.nameFa}</legend>
              <ul className="divide-y divide-espresso/8">
                {items.map((item) => {
                  const index = data.featuredIds.indexOf(item.id);
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-4 py-2.5">
                      <label className="flex items-center gap-3 text-sm">
                        <input type="checkbox" name="featured" value={item.id} defaultChecked={index >= 0} className="size-4 accent-caramel" />
                        {item.nameFa}
                        {!item.available && <span className="text-xs text-chocolate/50">(ناموجود — نمایش داده نمی‌شود)</span>}
                      </label>
                      <input
                        type="number"
                        name={`order:${item.id}`}
                        min={1}
                        max={99}
                        defaultValue={index >= 0 ? index + 1 : ""}
                        placeholder="ترتیب"
                        aria-label={`ترتیب ${item.nameFa}`}
                        dir="ltr"
                        className="h-9 w-20 rounded-lg border border-espresso/20 px-2 text-sm"
                      />
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
        <SubmitButton>ذخیره</SubmitButton>
      </ActionForm>
    </>
  );
}
