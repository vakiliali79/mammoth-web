import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/data/repository";

export const metadata = { title: "تماس و ساعات کاری" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="تماس و ساعات کاری" description="این اطلاعات در بخش تماس، پاورقی و داده‌های ساختاریافته (SEO) سایت استفاده می‌شود." />
      <SettingsForm settings={settings} />
    </>
  );
}
