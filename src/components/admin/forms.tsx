"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { emptyState, type FormState } from "@/lib/admin/form-state";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export const inputClass =
  "h-11 w-full rounded-xl border border-espresso/20 bg-white px-3.5 text-[0.95rem] outline-none transition-colors focus:border-caramel disabled:opacity-60";

/** Pending state of the surrounding <ActionForm> (null when used inside a plain form). */
const PendingContext = createContext<boolean | null>(null);

export function SubmitButton({ children, className = "btn btn-dark" }: { children: ReactNode; className?: string }) {
  const status = useFormStatus();
  const pending = useContext(PendingContext) ?? status.pending;
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "در حال ذخیره…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      data-form-message={state.ok ? "ok" : "error"}
      className={`rounded-xl px-4 py-2.5 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
    >
      {state.message}
    </p>
  );
}

/** A form bound to a server action that shows the returned message and field errors. */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode | ((state: FormState) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, emptyState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      // Submit manually: React would otherwise reset every field after the action,
      // wiping what the admin typed whenever validation fails.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <PendingContext.Provider value={pending}>
        {typeof children === "function" ? children(state) : children}
        <FormMessage state={state} />
      </PendingContext.Provider>
    </form>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`} htmlFor={name}>
      <span className="mb-1.5 block text-sm font-medium text-chocolate">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-chocolate/55">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

/** Submit button that asks for confirmation first (used for deletes). */
export function ConfirmSubmit({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  const status = useFormStatus();
  const pending = useContext(PendingContext) ?? status.pending;
  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? "rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export interface RowColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "time" | "checkbox";
  placeholder?: string;
  dir?: "ltr" | "rtl";
  width?: string;
}

/** Editable list of rows (sizes/variants, working hours) serialised into one hidden JSON field. */
export function RowsEditor({
  name,
  columns,
  initial,
  addLabel,
  emptyRow,
  max = 10,
}: {
  name: string;
  columns: RowColumn[];
  initial: Record<string, string | number | boolean>[];
  addLabel: string;
  emptyRow: Record<string, string | number | boolean>;
  max?: number;
}) {
  const [rows, setRows] = useState(initial);
  const update = (i: number, key: string, value: string | boolean) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  return (
    <div data-rows={name}>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-cream/50 p-2.5">
            {columns.map((col) =>
              col.type === "checkbox" ? (
                <label key={col.key} className="flex h-11 items-center gap-2 px-2 text-sm">
                  <input type="checkbox" checked={Boolean(row[col.key])} onChange={(e) => update(i, col.key, e.target.checked)} className="size-4 accent-caramel" />
                  {col.label}
                </label>
              ) : (
                <label key={col.key} className={`block ${col.width ?? "min-w-28 flex-1"}`}>
                  <span className="mb-1 block text-xs text-chocolate/60">{col.label}</span>
                  <input
                    type={col.type ?? "text"}
                    inputMode={col.type === "number" ? "numeric" : undefined}
                    dir={col.dir}
                    value={String(row[col.key] ?? "")}
                    placeholder={col.placeholder}
                    onChange={(e) => update(i, col.key, e.target.value)}
                    aria-label={`${col.label} ${i + 1}`}
                    className={inputClass}
                  />
                </label>
              ),
            )}
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
              className="h-11 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50"
            >
              حذف
            </button>
          </div>
        ))}
      </div>
      {rows.length < max && (
        <button type="button" onClick={() => setRows((r) => [...r, { ...emptyRow }])} className="mt-2 rounded-lg border border-dashed border-espresso/30 px-4 py-2 text-sm hover:border-caramel">
          + {addLabel}
        </button>
      )}
    </div>
  );
}

/** File input with a live preview of the selected image. */
export function ImageInput({ name, current }: { name: string; current?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const shown = preview ?? current;
  return (
    <div className="flex items-center gap-4">
      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-espresso/15 bg-cream text-xs text-chocolate/50">
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview / small admin thumbnail */}
        {shown ? <img src={shown} alt="" className="size-full object-cover" /> : "بدون تصویر"}
      </div>
      <div className="min-w-0 flex-1">
        <input
          id={name}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-espresso file:px-4 file:py-2 file:text-sm file:text-cream"
        />
        <p className="mt-1.5 text-xs text-chocolate/55">JPG، PNG، WebP یا AVIF — حداکثر ۸ مگابایت. تصویر به‌صورت خودکار بهینه می‌شود.</p>
      </div>
    </div>
  );
}
