"use client";

import { addGalleryAction, deleteGalleryAction, updateGalleryAction } from "@/app/admin/actions";
import { ActionForm, ConfirmSubmit, Field, ImageInput, inputClass, SubmitButton } from "@/components/admin/forms";
import type { GalleryImage } from "@/lib/data/types";

function Fields({ image, k }: { image?: GalleryImage; k: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="توضیح تصویر (فارسی)" name={`altFa-${k}`}>
        <input id={`altFa-${k}`} name="altFa" defaultValue={image?.altFa} maxLength={120} className={inputClass} />
      </Field>
      <Field label="توضیح تصویر (انگلیسی)" name={`altEn-${k}`}>
        <input id={`altEn-${k}`} name="altEn" defaultValue={image?.altEn} maxLength={120} dir="ltr" className={inputClass} />
      </Field>
      <Field label="ترتیب" name={`order-${k}`}>
        <input id={`order-${k}`} name="order" type="number" min={0} defaultValue={image?.order ?? 99} dir="ltr" className={inputClass} />
      </Field>
      <Field label="اندازه در چیدمان" name={`size-${k}`}>
        <select id={`size-${k}`} name="size" defaultValue={image?.size ?? "normal"} className={inputClass}>
          <option value="normal">معمولی</option>
          <option value="wide">عریض</option>
          <option value="tall">بلند</option>
        </select>
      </Field>
    </div>
  );
}

export function GalleryAddForm() {
  return (
    <ActionForm action={addGalleryAction} resetOnSuccess className="space-y-4 rounded-2xl border border-espresso/10 bg-white p-5">
      <ImageInput name="imageFile" />
      <Fields k="new" />
      <SubmitButton>افزودن به گالری</SubmitButton>
    </ActionForm>
  );
}

export function GalleryItemForm({ image }: { image: GalleryImage }) {
  return (
    <li className="rounded-2xl border border-espresso/10 bg-white p-4" data-gallery-item={image.id}>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
      <img src={image.src} alt={image.altFa} loading="lazy" className="mb-4 aspect-[3/2] w-full rounded-xl object-cover" />
      <ActionForm action={updateGalleryAction} className="space-y-3">
        <input type="hidden" name="id" value={image.id} />
        <Fields image={image} k={image.id} />
        <SubmitButton className="btn btn-dark min-h-10 px-5 py-2 text-sm">ذخیره</SubmitButton>
      </ActionForm>
      <form action={deleteGalleryAction} className="mt-1">
        <input type="hidden" name="id" value={image.id} />
        <ConfirmSubmit message="این تصویر از گالری حذف شود؟">حذف تصویر</ConfirmSubmit>
      </form>
    </li>
  );
}
