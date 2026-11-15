"use client";

import { saveSettingsAction } from "@/app/admin/actions";
import { ActionForm, Field, RowsEditor, SubmitButton } from "@/components/admin/forms";
import { inputClass } from "@/lib/admin/styles";
import type { SiteSettings } from "@/lib/data/types";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const c = settings.contact;
  return (
    <ActionForm action={saveSettingsAction} className="max-w-3xl space-y-6">
      {(state) => {
        const e = state.errors ?? {};
        const hoursError = Object.entries(e).find(([k]) => k.startsWith("hours"))?.[1];
        return (
          <>
            <div className="grid gap-5 rounded-2xl border border-deep/10 bg-white p-5 md:grid-cols-2 md:p-6">
              <h2 className="font-bold md:col-span-2">اطلاعات تماس</h2>
              <Field label="نشانی (فارسی)" name="addressFa" error={e["contact.addressFa"]} className="md:col-span-2">
                <input id="addressFa" name="addressFa" defaultValue={c.addressFa} maxLength={300} className={inputClass} />
              </Field>
              <Field label="نشانی (انگلیسی)" name="addressEn" error={e["contact.addressEn"]} className="md:col-span-2">
                <input id="addressEn" name="addressEn" defaultValue={c.addressEn} maxLength={300} dir="ltr" className={inputClass} />
              </Field>
              <Field label="تلفن" name="phone" error={e["contact.phone"]}>
                <input id="phone" name="phone" type="tel" defaultValue={c.phone} dir="ltr" className={inputClass} />
              </Field>
              <Field label="اینستاگرام" name="instagram" error={e["contact.instagram"]} hint="فقط شناسه، بدون @">
                <input id="instagram" name="instagram" defaultValue={c.instagram} dir="ltr" className={inputClass} />
              </Field>
              <Field label="ایمیل" name="email" error={e["contact.email"]}>
                <input id="email" name="email" type="email" defaultValue={c.email} dir="ltr" className={inputClass} />
              </Field>
              <Field label="لینک مسیریابی" name="mapUrl" error={e["contact.mapUrl"]} hint="لینک گوگل‌مپ، نشان یا بلد (https://…)">
                <input id="mapUrl" name="mapUrl" type="url" defaultValue={c.mapUrl} dir="ltr" className={inputClass} />
              </Field>
              <Field label="عرض جغرافیایی (latitude)" name="latitude" error={e["contact.latitude"]} hint="برای نمایش نقشه در سایت؛ مثلاً 35.7000">
                <input id="latitude" name="latitude" inputMode="decimal" defaultValue={c.latitude ?? ""} dir="ltr" className={inputClass} />
              </Field>
              <Field label="طول جغرافیایی (longitude)" name="longitude" error={e["contact.longitude"]} hint="مثلاً 51.4000">
                <input id="longitude" name="longitude" inputMode="decimal" defaultValue={c.longitude ?? ""} dir="ltr" className={inputClass} />
              </Field>
            </div>

            <div className="rounded-2xl border border-deep/10 bg-white p-5 md:p-6">
              <h2 className="mb-4 font-bold">ساعات کاری</h2>
              <RowsEditor
                name="hours"
                initial={settings.hours.map((h) => ({ ...h }))}
                addLabel="افزودن ردیف"
                emptyRow={{ daysFa: "", daysEn: "", open: "08:00", close: "23:00", closed: false }}
                columns={[
                  { key: "daysFa", label: "روزها (فارسی)", placeholder: "شنبه تا چهارشنبه" },
                  { key: "daysEn", label: "روزها (انگلیسی)", placeholder: "Sat–Wed", dir: "ltr" },
                  { key: "open", label: "از", type: "time", dir: "ltr", width: "w-28" },
                  { key: "close", label: "تا", type: "time", dir: "ltr", width: "w-28" },
                  { key: "closed", label: "تعطیل", type: "checkbox" },
                ]}
              />
              {hoursError && <p className="mt-2 text-xs text-red-700">{hoursError}</p>}
            </div>

            <div className="rounded-2xl border border-deep/10 bg-white p-5 md:p-6">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="demoMode" defaultChecked={settings.demoMode} className="mt-0.5 size-5 accent-red" />
                <span>
                  <span className="font-bold">حالت نمایشی</span>
                  <span className="mt-1 block text-carbon/65">
                    تا وقتی فعال است، برچسب «نسخه نمایشی — داده‌ها نمونه هستند» در سایت نمایش داده می‌شود. پس از وارد کردن اطلاعات واقعی خاموش کنید.
                  </span>
                </span>
              </label>
            </div>

            <SubmitButton>ذخیره تنظیمات</SubmitButton>
          </>
        );
      }}
    </ActionForm>
  );
}
