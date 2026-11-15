import { GalleryAddForm, GalleryItemForm } from "@/components/admin/GalleryForms";
import { PageHeader } from "@/components/admin/PageHeader";
import { getGallery } from "@/lib/data/repository";

export const metadata = { title: "گالری" };

export default async function GalleryPage() {
  const gallery = await getGallery();
  return (
    <>
      <PageHeader title="گالری" description="تصاویر بخش گالری صفحه اصلی. تصاویر نمونه فعلی را با عکس‌های واقعی کافه جایگزین کنید." />
      <h2 className="mb-3 text-lg font-bold">تصویر جدید</h2>
      <div className="mb-10 max-w-2xl">
        <GalleryAddForm />
      </div>
      <h2 className="mb-3 text-lg font-bold">تصاویر فعلی ({gallery.length})</h2>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gallery.map((image) => (
          <GalleryItemForm key={image.id} image={image} />
        ))}
      </ul>
    </>
  );
}
