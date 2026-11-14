"use client";

import Link from "next/link";
import { saveItemAction } from "@/app/admin/actions";
import { ActionForm, Field, ImageInput, inputClass, RowsEditor, SubmitButton } from "@/components/admin/forms";
import type { Category, MenuItem } from "@/lib/data/types";

export function ItemForm({ item, categories }: { item?: MenuItem; categories: Category[] }) {
  return (
    <ActionForm action={saveItemAction} className="max-w-3xl space-y-6">
      {(state) => {
        const e = state.errors ?? {};
        return (
          <>
            {item && <input type="hidden" name="id" value={item.id} />}
            <input type="hidden" name="currentImage" value={item?.image ?? ""} />

            <div className="grid gap-5 rounded-2xl border border-espresso/10 bg-white p-5 md:grid-cols-2 md:p-6">
              <Field label="نام فارسی *" name="nameFa" error={e.nameFa}>
                <input id="nameFa" name="nameFa" defaultValue={item?.nameFa} required maxLength={80} className={inputClass} />
              </Field>
              <Field label="نام انگلیسی" name="nameEn" error={e.nameEn}>
                <input id="nameEn" name="nameEn" defaultValue={item?.nameEn} maxLength={80} dir="ltr" className={inputClass} />
              </Field>
              <Field label="توضیح فارسی" name="descriptionFa" error={e.descriptionFa} className="md:col-span-2">
                <textarea id="descriptionFa" name="descriptionFa" defaultValue={item?.descriptionFa} maxLength={400} rows={2} className={`${inputClass} h-auto py-2.5`} />
              </Field>
              <Field label="توضیح انگلیسی" name="descriptionEn" error={e.descriptionEn} className="md:col-span-2">
                <textarea id="descriptionEn" name="descriptionEn" defaultValue={item?.descriptionEn} maxLength={400} rows={2} dir="ltr" className={`${inputClass} h-auto py-2.5`} />
              </Field>
              <Field label="دسته‌بندی *" name="categoryId" error={e.categoryId}>
                <select id="categoryId" name="categoryId" defaultValue={item?.categoryId ?? categories[0]?.id} required className={inputClass}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameFa}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="قیمت پایه (تومان) *" name="price" error={e.price}>
                <input id="price" name="price" type="number" min={0} step={1000} defaultValue={item?.price ?? ""} required dir="ltr" className={inputClass} />
              </Field>
              <Field label="ترتیب نمایش" name="order" error={e.order} hint="عدد کوچک‌تر، بالاتر نمایش داده می‌شود">
                <input id="order" name="order" type="number" min={0} defaultValue={item?.order ?? 0} dir="ltr" className={inputClass} />
              </Field>
              <div className="flex flex-wrap items-center gap-6 md:pt-7">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="available" defaultChecked={item?.available ?? true} className="size-4 accent-caramel" />
                  موجود است
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="popular" defaultChecked={item?.popular ?? false} className="size-4 accent-caramel" />
                  برچسب «محبوب»
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-espresso/10 bg-white p-5 md:p-6">
              <h2 className="mb-4 font-bold">تصویر محصول</h2>
              <ImageInput name="imageFile" current={item?.image} />
              {e.image && <p className="mt-2 text-xs text-red-700">{e.image}</p>}
            </div>

            <div className="rounded-2xl border border-espresso/10 bg-white p-5 md:p-6">
              <h2 className="font-bold">اندازه‌ها / انتخاب‌ها (اختیاری)</h2>
              <p className="mt-1 mb-4 text-xs text-chocolate/60">
                اگر محصول چند اندازه یا نوع سرو دارد، اینجا وارد کنید. در این حالت به‌جای قیمت پایه، قیمت هر اندازه در منو نمایش داده می‌شود.
              </p>
              <RowsEditor
                name="variants"
                initial={(item?.variants ?? []).map((v) => ({ ...v }))}
                addLabel="افزودن اندازه"
                emptyRow={{ labelFa: "", labelEn: "", price: "" }}
                max={8}
                columns={[
                  { key: "labelFa", label: "عنوان فارسی", placeholder: "بزرگ" },
                  { key: "labelEn", label: "عنوان انگلیسی", placeholder: "Large", dir: "ltr" },
                  { key: "price", label: "قیمت (تومان)", type: "number", dir: "ltr" },
                ]}
              />
              {Object.entries(e)
                .filter(([k]) => k.startsWith("variants"))
                .slice(0, 1)
                .map(([k, v]) => (
                  <p key={k} className="mt-2 text-xs text-red-700">
                    {v}
                  </p>
                ))}
            </div>

            <div className="flex items-center gap-3">
              <SubmitButton>{item ? "ذخیره تغییرات" : "افزودن محصول"}</SubmitButton>
              <Link href="/admin/items" className="btn btn-outline">
                انصراف
              </Link>
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}
