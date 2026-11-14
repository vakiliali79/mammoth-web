"use client";

import { useActionState } from "react";
import { toggleItemAction, updatePriceAction } from "@/app/admin/actions";
import { emptyState } from "@/lib/admin/form-state";

/** Inline price editor used in the product table. */
export function PriceForm({ id, price }: { id: string; price: number }) {
  const [state, action, pending] = useActionState(updatePriceAction, emptyState);
  return (
    <form action={action} className="flex items-center gap-2" data-price-form={id}>
      <input type="hidden" name="id" value={id} />
      <input
        name="price"
        type="number"
        min={0}
        step={1000}
        defaultValue={price}
        dir="ltr"
        aria-label="قیمت به تومان"
        className="h-10 w-28 rounded-lg border border-espresso/20 bg-white px-2 text-sm outline-none focus:border-caramel"
      />
      <button disabled={pending} className="h-10 rounded-lg border border-espresso/20 px-3 text-xs hover:border-caramel disabled:opacity-50">
        {pending ? "…" : "ثبت"}
      </button>
      {state.message && (
        <span role="status" data-price-status={state.ok ? "ok" : "error"} className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}

/** Switch that flips a boolean flag on an item. */
export function ToggleForm({ id, field, value, label }: { id: string; field: "available" | "popular"; value: boolean; label: string }) {
  return (
    <form action={toggleItemAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={String(!value)} />
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        data-toggle={`${field}:${id}`}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-caramel" : "bg-espresso/20"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${value ? "right-0.5" : "right-[1.375rem]"}`} />
      </button>
    </form>
  );
}
