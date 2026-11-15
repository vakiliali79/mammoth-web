/**
 * Domain types for MAMMOTH CAFE.
 * These are storage-agnostic: the file store and a future PostgreSQL/Prisma
 * adapter both speak these shapes (see PROJECT_ARCHITECTURE.md).
 */

export interface Category {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  order: number;
  visible: boolean;
}

export interface ItemVariant {
  labelFa: string;
  labelEn: string;
  /** Price in Toman */
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  /** Base price in Toman */
  price: number;
  /** Public path: `/images/...` (bundled) or `/media/...` (uploaded) */
  image: string;
  available: boolean;
  popular: boolean;
  order: number;
  variants: ItemVariant[];
}

export interface GalleryImage {
  id: string;
  src: string;
  altFa: string;
  altEn: string;
  order: number;
  /** Optional layout hint for the homepage grid */
  size: "normal" | "wide" | "tall";
}

export interface WorkingHours {
  daysFa: string;
  daysEn: string;
  /** "HH:MM" 24h */
  open: string;
  close: string;
  closed: boolean;
}

export interface ContactSettings {
  addressFa: string;
  addressEn: string;
  phone: string;
  /** Instagram handle without @ */
  instagram: string;
  email: string;
  /** External "open in maps" link (Google Maps, Neshan, Balad, …) */
  mapUrl: string;
  /** Optional coordinates: when both are set, an embedded map is shown */
  latitude: number | null;
  longitude: number | null;
}

export interface SiteSettings {
  contact: ContactSettings;
  hours: WorkingHours[];
  /** Shows a "demo data" ribbon on the public site while true */
  demoMode: boolean;
}

export interface SiteData {
  version: 1;
  categories: Category[];
  items: MenuItem[];
  /** Ordered list of item ids shown on the homepage */
  featuredIds: string[];
  gallery: GalleryImage[];
  settings: SiteSettings;
}
