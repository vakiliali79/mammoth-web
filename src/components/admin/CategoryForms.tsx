"use client";

import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { ActionForm, ConfirmSubmit, Field, SubmitButton } from "@/components/admin/forms";
import { inputClass } from "@/lib/admin/styles";
import type { Category } from "@/lib/data/types";

export function CategoryForm({ category, itemCount = 0 }: { category?: Category; itemCount?: number }) {
  const key = category?.id ?? "new";
  return (
    <div className="rounded-2xl border border-deep/10 bg-white p-5" data-category={category?.slug ?? "new"}>
      <ActionForm action={saveCategoryAction} resetOnSuccess={!category} className="space-y-4">
        {(state) => {
          const e = state.errors ?? {};
          return (
            <>
              {category && <input type="hidden" name="id" value={category.id} />}
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_6rem]">
                <Field label="نام فارسی *" name={`nameFa-${key}`} error={e.nameFa}>
                  <input id={`nameFa-${key}`} name="nameFa" defaultValue={category?.nameFa} required maxLength={60} className={inputClass} />
                </Field>
                <Field label="نام انگلیسی" name={`nameEn-${key}`} error={e.nameEn}>
                  <input id={`nameEn-${key}`} name="nameEn" defaultValue={category?.nameEn} maxLength={60} dir="ltr" className={inputClass} />
                </Field>
                <Field label="نامک (slug) *" name={`slug-${key}`} error={e.slug} hint="مثلاً hot-coffee">
                  <input id={`slug-${key}`} name="slug" defaultValue={category?.slug} required maxLength={60} dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputClass} />
                </Field>
                <Field label="ترتیب" name={`order-${key}`} error={e.order}>
                  <input id={`order-${key}`} name="order" type="number" min={0} defaultValue={category?.order ?? 99} dir="ltr" className={inputClass} />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="visible" defaultChecked={category?.visible ?? true} className="size-5 accent-red" />
                  نمایش در منو
                </label>
                <SubmitButton className="btn btn-dark min-h-10 px-5 py-2 text-sm">{category ? "ذخیره" : "افزودن دسته‌بندی"}</SubmitButton>
                {category && <span className="text-xs text-carbon/55">{itemCount} محصول</span>}
              </div>
            </>
          );
        }}
      </ActionForm>
      {category && (
        <ActionForm action={deleteCategoryAction} className="mt-2 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={category.id} />
          <ConfirmSubmit message={`دسته «${category.nameFa}» حذف شود؟`}>حذف دسته‌بندی</ConfirmSubmit>
        </ActionForm>
      )}
    </div>
  );
}
