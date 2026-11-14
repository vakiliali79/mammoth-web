import { CategoryForm } from "@/components/admin/CategoryForms";
import { PageHeader } from "@/components/admin/PageHeader";
import { getSiteData } from "@/lib/data/repository";

export const metadata = { title: "دسته‌بندی‌ها" };

export default async function CategoriesPage() {
  const data = await getSiteData();
  return (
    <>
      <PageHeader title="دسته‌بندی‌ها" description="دسته‌های منو را بسازید، ویرایش و مرتب کنید. دسته‌ای که محصول دارد قابل حذف نیست." />
      <div className="max-w-5xl space-y-4">
        {data.categories.map((c) => (
          <CategoryForm key={c.id} category={c} itemCount={data.items.filter((i) => i.categoryId === c.id).length} />
        ))}
        <h2 className="pt-6 text-lg font-bold">دسته‌بندی جدید</h2>
        <CategoryForm />
      </div>
    </>
  );
}
