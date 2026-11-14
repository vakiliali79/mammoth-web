import "server-only";
import { randomUUID } from "node:crypto";
import { getStore } from "./store";
import type { CategoryInput, GalleryInput, ItemInput, SettingsInput } from "./schema";
import type { Category, GalleryImage, MenuItem, SiteData, SiteSettings } from "./types";

/** Thrown for expected, user-facing failures (shown in the admin UI). */
export class DataError extends Error {}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

// ─── Reads ──────────────────────────────────────────────────────────────

export async function getSiteData(): Promise<SiteData> {
  const data = await getStore().read();
  data.categories.sort(byOrder);
  data.items.sort(byOrder);
  data.gallery.sort(byOrder);
  return data;
}

export interface MenuSection {
  category: Category;
  items: MenuItem[];
}

/** Public menu: visible categories with their items, empty categories dropped. */
export async function getPublicMenu(): Promise<MenuSection[]> {
  const data = await getSiteData();
  return data.categories
    .filter((c) => c.visible)
    .map((category) => ({
      category,
      items: data.items.filter((i) => i.categoryId === category.id),
    }))
    .filter((s) => s.items.length > 0);
}

export async function getFeaturedItems(): Promise<(MenuItem & { category: Category })[]> {
  const data = await getSiteData();
  const out: (MenuItem & { category: Category })[] = [];
  for (const id of data.featuredIds) {
    const item = data.items.find((i) => i.id === id);
    const category = item && data.categories.find((c) => c.id === item.categoryId);
    if (item && category && category.visible && item.available) out.push({ ...item, category });
  }
  return out;
}

export async function getSettings(): Promise<SiteSettings> {
  return (await getSiteData()).settings;
}

export async function getGallery(): Promise<GalleryImage[]> {
  return (await getSiteData()).gallery;
}

// ─── Categories ─────────────────────────────────────────────────────────

export async function createCategory(input: CategoryInput): Promise<Category> {
  return getStore().update((data) => {
    if (data.categories.some((c) => c.slug === input.slug))
      throw new DataError("این نامک (slug) قبلاً استفاده شده است");
    const category: Category = { id: randomUUID(), ...input };
    data.categories.push(category);
    return category;
  });
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  await getStore().update((data) => {
    const category = data.categories.find((c) => c.id === id);
    if (!category) throw new DataError("دسته‌بندی پیدا نشد");
    if (data.categories.some((c) => c.slug === input.slug && c.id !== id))
      throw new DataError("این نامک (slug) قبلاً استفاده شده است");
    Object.assign(category, input);
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await getStore().update((data) => {
    if (data.items.some((i) => i.categoryId === id))
      throw new DataError("ابتدا محصولات این دسته را حذف یا منتقل کنید");
    data.categories = data.categories.filter((c) => c.id !== id);
  });
}

// ─── Items ──────────────────────────────────────────────────────────────

function assertCategory(data: SiteData, categoryId: string) {
  if (!data.categories.some((c) => c.id === categoryId)) throw new DataError("دسته‌بندی نامعتبر است");
}

export async function createItem(input: ItemInput): Promise<MenuItem> {
  return getStore().update((data) => {
    assertCategory(data, input.categoryId);
    const item: MenuItem = { id: randomUUID(), ...input };
    data.items.push(item);
    return item;
  });
}

/** Returns the previous image path so the caller can clean up replaced uploads. */
export async function updateItem(id: string, input: ItemInput): Promise<string> {
  return getStore().update((data) => {
    assertCategory(data, input.categoryId);
    const item = data.items.find((i) => i.id === id);
    if (!item) throw new DataError("محصول پیدا نشد");
    const previous = item.image;
    Object.assign(item, input);
    return previous;
  });
}

export async function patchItem(
  id: string,
  patch: Partial<Pick<MenuItem, "available" | "popular" | "price">>,
): Promise<void> {
  await getStore().update((data) => {
    const item = data.items.find((i) => i.id === id);
    if (!item) throw new DataError("محصول پیدا نشد");
    Object.assign(item, patch);
  });
}

export async function deleteItem(id: string): Promise<string | null> {
  return getStore().update((data) => {
    const item = data.items.find((i) => i.id === id);
    data.items = data.items.filter((i) => i.id !== id);
    data.featuredIds = data.featuredIds.filter((f) => f !== id);
    return item?.image ?? null;
  });
}

export async function setFeatured(ids: string[]): Promise<void> {
  await getStore().update((data) => {
    const valid = new Set(data.items.map((i) => i.id));
    data.featuredIds = [...new Set(ids)].filter((id) => valid.has(id)).slice(0, 12);
  });
}

// ─── Gallery ────────────────────────────────────────────────────────────

export async function addGalleryImage(src: string, input: GalleryInput): Promise<GalleryImage> {
  return getStore().update((data) => {
    const image: GalleryImage = { id: randomUUID(), src, ...input };
    data.gallery.push(image);
    return image;
  });
}

export async function updateGalleryImage(id: string, input: GalleryInput): Promise<void> {
  await getStore().update((data) => {
    const image = data.gallery.find((g) => g.id === id);
    if (!image) throw new DataError("تصویر پیدا نشد");
    Object.assign(image, input);
  });
}

export async function deleteGalleryImage(id: string): Promise<string | null> {
  return getStore().update((data) => {
    const image = data.gallery.find((g) => g.id === id);
    data.gallery = data.gallery.filter((g) => g.id !== id);
    return image?.src ?? null;
  });
}

// ─── Settings ───────────────────────────────────────────────────────────

export async function saveSettings(input: SettingsInput): Promise<void> {
  await getStore().update((data) => {
    data.settings = input;
  });
}
