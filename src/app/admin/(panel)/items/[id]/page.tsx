import { notFound } from "next/navigation";
import { ItemForm } from "@/components/admin/ItemForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getSiteData } from "@/lib/data/repository";

export const metadata = { title: "ویرایش محصول" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSiteData();
  const item = data.items.find((i) => i.id === id);
  if (!item) notFound();
  return (
    <>
      <PageHeader title={`ویرایش «${item.nameFa}»`} />
      <ItemForm item={item} categories={data.categories} />
    </>
  );
}
