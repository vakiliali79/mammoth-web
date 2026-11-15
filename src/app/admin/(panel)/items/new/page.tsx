import { ItemForm } from "@/components/admin/ItemForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getSiteData } from "@/lib/data/repository";

export const metadata = { title: "محصول جدید" };

export default async function NewItemPage() {
  const data = await getSiteData();
  return (
    <>
      <PageHeader title="محصول جدید" />
      <ItemForm categories={data.categories} />
    </>
  );
}
