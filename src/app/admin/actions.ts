"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import type { FormState } from "@/lib/admin/form-state";
import { clearFailures, isBlocked, recordFailure } from "@/lib/auth/rate-limit";
import { checkCredentials, endSession, getAuthConfig, requireAdmin, startSession } from "@/lib/auth/session";
import * as repo from "@/lib/data/repository";
import { DataError } from "@/lib/data/repository";
import {
  categoryInputSchema,
  galleryInputSchema,
  itemInputSchema,
  settingsSchema,
} from "@/lib/data/schema";
import { deleteUpload, saveImage, UploadError } from "@/lib/uploads";

/**
 * All admin mutations. Every action re-checks the session itself:
 * Server Actions are public HTTP endpoints, so page-level guards are not enough.
 */

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const flag = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";

function zodErrors(error: ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, message: "لطفاً خطاهای فرم را برطرف کنید.", errors };
}

function failure(err: unknown): FormState {
  if (err instanceof DataError || err instanceof UploadError) return { ok: false, message: err.message };
  throw err;
}

function parseJsonArray(raw: string): unknown[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

// ─── Auth ───────────────────────────────────────────────────────────────

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!getAuthConfig()) return { ok: false, message: "پنل مدیریت هنوز پیکربندی نشده است." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (isBlocked(ip)) return { ok: false, message: "تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه دیگر دوباره امتحان کنید." };

  const username = str(fd, "username").trim().slice(0, 100);
  const password = str(fd, "password").slice(0, 200);
  if (!checkCredentials(username, password)) {
    recordFailure(ip);
    return { ok: false, message: "نام کاربری یا رمز عبور نادرست است." };
  }
  clearFailures(ip);
  await startSession(username);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

// ─── Menu items ─────────────────────────────────────────────────────────

export async function saveItemAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const currentImage = str(fd, "currentImage");

  const parsed = itemInputSchema.safeParse({
    categoryId: str(fd, "categoryId"),
    nameFa: str(fd, "nameFa"),
    nameEn: str(fd, "nameEn"),
    descriptionFa: str(fd, "descriptionFa"),
    descriptionEn: str(fd, "descriptionEn"),
    price: str(fd, "price"),
    image: currentImage,
    available: flag(fd, "available"),
    popular: flag(fd, "popular"),
    order: str(fd, "order") || "0",
    variants: parseJsonArray(str(fd, "variants")),
  });
  if (!parsed.success) return zodErrors(parsed.error);

  let uploaded: string | null = null;
  try {
    const file = fd.get("imageFile");
    if (file instanceof File && file.size > 0) {
      uploaded = await saveImage(file);
      parsed.data.image = uploaded;
    }
    if (id) {
      const previous = await repo.updateItem(id, parsed.data);
      if (uploaded && previous !== uploaded) await deleteUpload(previous);
    } else {
      await repo.createItem(parsed.data);
    }
  } catch (err) {
    await deleteUpload(uploaded);
    return failure(err);
  }
  refresh();
  redirect("/admin/items?saved=1");
}

export async function deleteItemAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const image = await repo.deleteItem(str(fd, "id"));
  await deleteUpload(image);
  refresh();
}

export async function toggleItemAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const field = str(fd, "field");
  if (field !== "available" && field !== "popular") return;
  try {
    await repo.patchItem(str(fd, "id"), { [field]: flag(fd, "value") });
  } catch (err) {
    if (!(err instanceof DataError)) throw err;
  }
  refresh();
}

export async function updatePriceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = itemInputSchema.shape.price.safeParse(str(fd, "price"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "قیمت نامعتبر است" };
  try {
    await repo.patchItem(str(fd, "id"), { price: parsed.data });
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true, message: "ذخیره شد" };
}

// ─── Categories ─────────────────────────────────────────────────────────

export async function saveCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const parsed = categoryInputSchema.safeParse({
    nameFa: str(fd, "nameFa"),
    nameEn: str(fd, "nameEn"),
    slug: str(fd, "slug"),
    order: str(fd, "order") || "0",
    visible: flag(fd, "visible"),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  try {
    if (id) await repo.updateCategory(id, parsed.data);
    else await repo.createCategory(parsed.data);
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true, message: id ? "دسته‌بندی به‌روزرسانی شد" : "دسته‌بندی اضافه شد" };
}

export async function deleteCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await repo.deleteCategory(str(fd, "id"));
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true, message: "دسته‌بندی حذف شد" };
}

// ─── Featured products ──────────────────────────────────────────────────

export async function saveFeaturedAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const ids = fd
    .getAll("featured")
    .map(String)
    .map((id) => ({ id, order: Number(fd.get(`order:${id}`)) || 999 }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.id);
  await repo.setFeatured(ids);
  refresh();
  return { ok: true, message: "محصولات منتخب صفحه اصلی ذخیره شد" };
}

// ─── Gallery ────────────────────────────────────────────────────────────

const galleryFields = (fd: FormData) => ({
  altFa: str(fd, "altFa"),
  altEn: str(fd, "altEn"),
  order: str(fd, "order") || "0",
  size: str(fd, "size") || "normal",
});

export async function addGalleryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = galleryInputSchema.safeParse(galleryFields(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const file = fd.get("imageFile");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "یک تصویر انتخاب کنید." };
  let uploaded: string | null = null;
  try {
    uploaded = await saveImage(file);
    await repo.addGalleryImage(uploaded, parsed.data);
  } catch (err) {
    await deleteUpload(uploaded);
    return failure(err);
  }
  refresh();
  return { ok: true, message: "تصویر به گالری اضافه شد" };
}

export async function updateGalleryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = galleryInputSchema.safeParse(galleryFields(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  try {
    await repo.updateGalleryImage(str(fd, "id"), parsed.data);
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true, message: "ذخیره شد" };
}

export async function deleteGalleryAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const src = await repo.deleteGalleryImage(str(fd, "id"));
  await deleteUpload(src);
  refresh();
}

// ─── Contact details & working hours ────────────────────────────────────

export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    contact: {
      addressFa: str(fd, "addressFa"),
      addressEn: str(fd, "addressEn"),
      phone: str(fd, "phone"),
      instagram: str(fd, "instagram"),
      email: str(fd, "email"),
      mapUrl: str(fd, "mapUrl"),
      latitude: str(fd, "latitude"),
      longitude: str(fd, "longitude"),
    },
    hours: parseJsonArray(str(fd, "hours")),
    demoMode: flag(fd, "demoMode"),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  await repo.saveSettings(parsed.data);
  refresh();
  return { ok: true, message: "تنظیمات ذخیره شد" };
}
